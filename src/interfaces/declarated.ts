export interface Protocol {
    cron?:        Cron;
    dependencies: { [key: string]: string[] };
    gateway?:     Gateway;
    hooks?:       Hooks;
    processors?:  { [key: string]: Processor };
    services?:    Service[];
}

export interface Cron {
    jobs:     { [key: string]: Job };
    timezone: string;
}

export interface Job {
    execute:     string;
    onComplete?: string;
    onError?:    string;
    pattern:     string;
}

export interface Gateway {
    events?: { [key: string]: Event };
    http?:   HTTP;
    [property: string]: any;
}

export interface Event {
    contract: string;
    execute:  string;
    onError?: string;
}

export interface HTTP {
    middlewares?: string[];
    routes:       { [key: string]: any };
}

export interface Hooks {
    init?:    string;
    started?: string;
    stopped?: string;
}

export interface Processor {
    contract:    string;
    execute:     string;
    onComplete?: string;
    onError?:    string;
    [property: string]: any;
}

export interface Service {
    actions:    { [key: string]: Action };
    name:       string;
    transports: string[];
    version:    number;
}

export interface Action {
    contract: string;
    execute:  string;
}
