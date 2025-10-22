export interface Protocol {
    cron?:        Cron;
    dependencies: { [key: string]: string[] };
    gateway?:     Gateway;
    processors?:  { [key: string]: Processor };
    services?:    Service[];
}

export interface Cron {
    jobs:     { [key: string]: Job };
    timezone: string;
}

export interface Job {
    execute:     any;
    onComplete?: any;
    onError?:    any;
    pattern:     string;
}

export interface Gateway {
    events?: { [key: string]: Event };
    http?:   HTTP;
}

export interface Event {
    execute:  any;
    headers:  any;
    input:    any;
    meta:     { [key: string]: any };
    onError?: any;
    output:   any;
    [property: string]: any;
}

export interface HTTP {
    middlewares: any[];
    routes:      Route[];
}

export interface Route {
    action:       Action;
    method:       Method;
    middlewares?: any[];
    url:          string;
}

export interface Action {
    alias?:       string;
    execute?:     any;
    executePath?: string;
    headers?:     any;
    input?:       any;
    meta?:        { [key: string]: any };
    output?:      any;
}

export enum Method {
    Delete = "DELETE",
    Get = "GET",
    Patch = "PATCH",
    Post = "POST",
    Put = "PUT",
}

export interface Processor {
    execute:     any;
    headers:     any;
    input:       any;
    meta:        { [key: string]: any };
    onComplete?: any;
    onError?:    any;
    output:      any;
    [property: string]: any;
}

export interface Service {
    actions:    { [key: string]: Contract };
    name:       string;
    transports: string[];
    version:    number;
}

export interface Contract {
    execute:     any;
    executePath: string;
    headers:     any;
    input:       any;
    meta:        { [key: string]: any };
    output:      any;
}
