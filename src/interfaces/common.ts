/* eslint-disable @typescript-eslint/no-explicit-any */

export type GenericObject = { [name: string]: any };
export type Constructor<T = GenericObject> = new (...args: any[]) => T;
export type Implementation = (adapters: GenericObject) => Record<string, GenericObject>;

export interface ProjectFile {
  dir?: {
    protocol?: string;
    contracts?: string;
  };
  adapters: string[];
  meta?: GenericObject;
}

export interface Project {
  ext: string;
  dir: {
    protocol: string;
    contracts: string;
    lib: string;
  };
  adapters: string[];
  meta: GenericObject;
}
