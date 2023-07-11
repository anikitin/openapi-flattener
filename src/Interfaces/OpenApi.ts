export interface OpenApi {
    openapi: string,
    info: Info
    externalDocs?: ExternalDocs
    servers?: ExternalDocs[]
    security?: Security[]
    tags?: Tag[]
    paths: { [id: string]: Path }
    components?: Components
}
export interface Path {
 'get': Operation
 'post': Operation
 'patch': Operation
 'put': Operation
 'delete': Operation
 'head': Operation
}
interface Parameter {
    in: string
    name: string
    description: string
    required: boolean
    schema: Schema
}
interface Schema {
    type: string
    enum?: string[]
}

interface Tag {
    name: string
    description: string
}
interface Security {
    bearerAuth?: any[]
    apiKey?: any[]
}
interface ExternalDocs {
    description: string
    url: string
}
interface Info {
    title: string
    description: string
    version: string
    contact: Contact
    license: Contact
}

export interface Response {
    content : {[key in ContentType]  : Content}
}

export interface RequestBody {
    content : {[key in ContentType] : Content}
}

export interface Content{
    schema: any
}
export const ResponseArray = ['200','201','202','204','400','401','403','404','409','429','500','501','502','503'];

export type ResponseCode = typeof ResponseArray[number]

export type ContentType = 'application/json'|'application/octet-stream'

export interface Components {
     schemas : {[key : string] : any}
     parameters : {[key : string] : any}
     examples : {[key : string] : any}
     responses : {[key : string] : Response}
     requestBodies: {[key : string] : RequestBody}
     callbacks: {[key : string] : { [id: string]: Path } }
}

// export interface Callback {
//     { [id: string]: Path }
// }

interface Contact {
    name: string
    url: string
}

export interface Operation {
    tags: string[]
    summary: string
    description: string
    operationId: string
    parameters: Parameter[]
    requestBody: RequestBody
    responses: { [responses in ResponseCode]: Response }
    callbacks: {[key : string] : { [id: string]: Path } }
}
/*
interface Get {
    tags: string[]
    summary: string
    description: string
    operationId: string
    parameters: Parameter[]
    responses: { [responses in ResponseCode]: Response }
}

interface Post {
    tags: string[]
    summary: string
    description: string
    operationId: string
    parameters: Parameter[]
    requestBody: RequestBody
    responses: { [responses in ResponseCode]: Response }
}
interface Patch {
    tags: string[]
    summary: string
    description: string
    operationId: string
    parameters: Parameter[]
    requestBody: RequestBody
    responses: { [responses in ResponseCode]: Response }
}

interface Put {
    tags: string[]
    summary: string
    description: string
    operationId: string
    parameters: Parameter[]
    requestBody: RequestBody
    responses: { [responses in ResponseCode]: Response }
}

interface Delete {
    tags: string[]
    summary: string
    description: string
    operationId: string
    parameters: Parameter[]
    requestBody: RequestBody
    responses: { [responses in ResponseCode]: Response }
}
*/
