/* eslint-disable class-methods-use-this */
import { join } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import type {
  GenericObject,
  Declarated,
  Implemented,
  Contract,
} from './interfaces/index.js';
import { get, throwErr } from './utils.js';
import { project, protocol, implementation } from './project.js';
import type { JSONSchemaType, AjvInstance } from './ajv.js';
import { ajv } from './ajv.js';

export abstract class Runner<
  D extends Declarated.Protocol = Declarated.Protocol,
  I extends Implemented.Protocol = Implemented.Protocol,
> {
  readonly #ajv: AjvInstance;
  readonly #customSchema?: JSONSchemaType<D>;
  readonly #start: () => Promise<void>;

  protected readonly protocol: D = protocol as D;
  protected implementation: Record<string, GenericObject> = {};
  protected implemented: I = {} as I;
  protected abstract adapters: GenericObject;

  constructor({
    ajv: externalAjv,
    schema,
    start,
  }: {
    ajv: AjvInstance,
    schema?: JSONSchemaType<D>,
    start: () => Promise<void>,
  }) {
    this.#ajv = externalAjv;
    if (schema != null) this.#customSchema = schema;
    this.#start = start;

    process.on('beforeExit', this.stop.bind(this));
    process.on('exit', this.stop.bind(this));
    process.on('SIGINT', this.stop.bind(this));
    process.on('SIGTERM', this.stop.bind(this));
  }

  async #init() {
    const contractsPath = join(project.dir.lib, 'json-schema', 'contract.json');
    const [declaratedBuffer, contractBuffer] = await Promise.all([
      readFile(join(project.dir.lib, 'json-schema', 'protocol.json'), 'utf-8'),
      readFile(contractsPath, 'utf-8'),
    ]);
    const protocolSchema = JSON.parse(declaratedBuffer) as JSONSchemaType<D>;
    const contractSchema = JSON.parse(contractBuffer) as JSONSchemaType<Contract>;

    if (this.#customSchema != null) {
      if (this.#customSchema.properties != null) {
        protocolSchema.properties = {
          ...protocolSchema.properties,
          ...this.#customSchema.properties,
        };
      }

      if (this.#customSchema.properties.gateway != null) {
        protocolSchema.properties.gateway = {
          ...protocolSchema.properties.gateway,
          ...this.#customSchema.properties.gateway,
        };
      }

      if (this.#customSchema.required != null) {
        protocolSchema.required = Array.from(new Set([
          ...protocolSchema.required,
          ...this.#customSchema.required,
        ]));
      }

      if (this.#customSchema.additionalProperties != null) {
        protocolSchema.additionalProperties = this.#customSchema.additionalProperties;
      }
    }

    await ajv.compileAsync<D>(protocolSchema);
    await ajv.compileAsync<Contract>(contractSchema);

    const files = (await readdir(project.dir.contracts)).filter((file) => file.endsWith('.json'));
    await Promise.all(files.map((schema) => this.#ajv.compileAsync({ $ref: schema })));
  }

  async #validateProtocol() {
    const validate = ajv.getSchema('protocol.json');
    if (!validate(protocol)) {
      throwErr("invalid declaration in 'protocol.json'", validate.errors);
    }
  }

  async #cleanup() {
    ajv.removeSchema('protocol.json');
    ajv.removeSchema('contract.json');
    ajv.removeSchema('transports.json');
  }

  protected abstract createServices(): Promise<void>;
  protected abstract createHTTP(): Promise<void>;
  protected abstract createCRON(): Promise<void>;
  protected abstract beforeImplement(): Promise<void>;
  protected abstract beforeStart(): Promise<void>;
  protected abstract beforeStop(): Promise<void>;

  async start() {
    await this.#init();
    await this.#validateProtocol();

    await this.beforeImplement();
    await this.#implement();

    this.#cleanup();

    await Promise.all([
      this.createHTTP(),
      this.createCRON(),
    ]);
    await this.beforeStart();
    this.createServices();
    await this.#start();
    await this.#hook('started');
  }

  async stop() {
    await this.#hook('stopped');
    this.beforeStop();
  }

  async #implement() {
    this.implementation = implementation(this.adapters);
    const validateContract = ajv.getSchema('contract.json');
    this.implemented.dependencies = protocol.dependencies;

    await this.#hook('init');

    if (protocol.services != null) {
      const implementedServices: Array<Implemented.Service> = [];

      await Promise.all(
        protocol.services
          .filter((svc) => !svc.name.startsWith('#'))
          .map(async (svc) => {
            const fullName = `${svc.name}.v${svc.version}`;
            const implementedServiceActions: { [k: string]: Implemented.Contract } = {};

            await Promise.all(
              Object.entries(svc.actions)
                .filter(([actionName]) => !actionName.startsWith('#'))
                .map(async ([actionName, action]) => {
                  const func = this.#ajv.getSchema<Contract>(action.contract);
                  const contract = func.schema as JSONSchemaType<Contract>;

                  if (!validateContract(contract)) {
                    throwErr(
                      `invalid contract '${action.contract}' in service '${fullName}.${actionName}'`,
                      validateContract.errors,
                    );
                  }

                  const execute = this.get<unknown>(this.implementation, action.execute);
                  if (execute == null) {
                    throwErr(`cannot retrieve implementation by path '${action.execute}' in service '${fullName}.${actionName}'`);
                  }

                  const { headers } = contract.properties;

                  implementedServiceActions[actionName] = {
                    meta: contract['x-meta'] ?? {},
                    headers: headers != null ? await this.#ajv.compileAsync({
                      $ref: `${contract.$id!}#/properties/headers`,
                    }) : undefined,
                    input: await this.#ajv.compileAsync({
                      $ref: `${contract.$id!}#/properties/input`,
                    }),
                    output: await this.#ajv.compileAsync({
                      $ref: `${contract.$id!}#/properties/output`,
                    }),
                    execute,
                    executePath: action.execute,
                  };
                }),
            );

            implementedServices.push({
              name: fullName,
              version: svc.version,
              transports: svc.transports,
              actions: implementedServiceActions,
            });
          }),
      );

      this.implemented.services = implementedServices;
    }

    if (protocol.gateway?.http != null) {
      const applyMiddleware = (route?: string) => (mw: string) => {
        const middleware = this.get<unknown>(this.implementation, mw);
        if (middleware == null || typeof middleware !== 'function') {
          throwErr(`cannot retrieve implementation for middleware '${mw}'${route != null ? ` in route '${route}'` : ''}`);
        }
        return middleware;
      };

      const routes: Implemented.HTTP['routes'] = [];

      await Promise.all(
        Object.entries(protocol.gateway.http.routes)
          .filter(([alias]) => !alias.startsWith('#'))
          .map(async ([alias, route]) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [_, method, url] = alias.split(/^(GET|POST|PUT|PATCH|DELETE)\s/);
            if (route.alias != null) {
              routes.push({
                method: method as Implemented.Method,
                url,
                action: route,
              });
              return;
            }

            const func = this.#ajv.getSchema<Contract>(route.contract);
            const contract = func.schema as JSONSchemaType<Contract>;

            if (!validateContract(contract)) {
              throwErr(
                `invalid contract '${route.contract}' in route '${alias}'`,
                validateContract.errors,
              );
            }

            const execute = this
              .get<Implemented.Action>(this.implementation, route.execute);

            if (execute != null) { // not alias
              const { headers } = contract.properties;

              routes.push({
                method: method as Implemented.Method,
                url,
                middlewares: route.middlewares?.map(applyMiddleware(alias)),
                action: {
                  meta: contract['x-meta'] ?? {},
                  headers: headers != null ? await this.#ajv.compileAsync({
                    $ref: `${contract.$id!}#/properties/headers`,
                  }) : undefined,
                  input: await this.#ajv.compileAsync({
                    $ref: `${contract.$id!}#/properties/input`,
                  }),
                  output: await this.#ajv.compileAsync({
                    $ref: `${contract.$id!}#/properties/output`,
                  }),
                  execute,
                  executePath: route.execute,
                },
              });
              return;
            }

            throwErr(`cannot retrieve implementation for '${route.execute}' in route '${alias}'`);
          }),
      );

      this.implemented.gateway = this.implemented.gateway ?? {};
      this.implemented.gateway.http = {
        middlewares: protocol.gateway.http.middlewares?.map(applyMiddleware()) ?? [],
        routes,
      };
    }

    if (protocol.cron != null) {
      const implemented: Implemented.Cron = {
        timezone: protocol.cron.timezone,
        jobs: {},
      };

      Object.entries(protocol.cron.jobs)
        .filter(([name]) => !name.startsWith('#'))
        .forEach(([name, job]) => {
          const execute = this.get<unknown>(this.implementation, job.execute);
          if (execute == null || typeof execute !== 'function') {
            throwErr(`cannot retrieve implementation by path '${job.execute}' in cron '${name}.execute'`);
          }

          const result: Implemented.Job = {
            pattern: job.pattern,
            execute,
          };

          if (job.onComplete != null) {
            const onComplete = this.get<unknown>(this.implementation, job.onComplete);
            if (onComplete == null || typeof onComplete !== 'function') {
              throwErr(`cannot retrieve implementation by path '${job.onComplete}' in cron '${name}.onComplete'`);
            }
            result.onComplete = onComplete;
          }

          if (job.onError != null) {
            const onError = this.get<unknown>(this.implementation, job.onError);
            if (onError == null || typeof onError !== 'function') {
              throwErr(`cannot retrieve implementation by path '${job.onError}' in cron '${name}.onError'`);
            }
            result.onError = onError;
          }

          implemented.jobs[name] = result;
        });

      this.implemented.cron = implemented;
    }
  }

  async #hook(name: 'init' | 'started' | 'stopped') {
    if (
      protocol.hooks != null
      && protocol.hooks[name]
      && Object.keys(this.implementation).length > 0
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const execute = this.get<any>(
        this.implementation,
        protocol.hooks[name],
      );
      if (execute == null || typeof execute !== 'function') {
        throwErr(`cannot retrieve ${name} hook '${protocol.hooks[name]}'`);
      }

      switch (name) {
        case 'started':
        case 'stopped': {
          await execute(this.adapters);
          break;
        }
        default: {
          await execute();
          break;
        }
      }
    }
  }

  protected get<T>(
    object: GenericObject,
    path: string,
    defaultValue = undefined,
  ): T | undefined {
    return get(object, path, defaultValue);
  }
}
