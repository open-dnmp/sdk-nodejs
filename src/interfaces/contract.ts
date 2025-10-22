export interface Contract {
    $id:        string;
    $schema:    Schema;
    properties: Properties;
    required:   string[];
    "x-group"?: string[];
    "x-meta"?:  XMeta;
    [property: string]: any;
}

export enum Schema {
    HTTPSJSONSchemaOrgDraft07Schema = "https://json-schema.org/draft-07/schema#",
}

export interface Properties {
    headers?: { [key: string]: any };
    input:    { [key: string]: any };
    output:   { [key: string]: any };
    [property: string]: any;
}

export interface XMeta {
    status_code?: number;
    [property: string]: any;
}
