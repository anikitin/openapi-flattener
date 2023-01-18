#!/usr/bin/env node

import {writeFileSync, readFileSync} from 'fs';
import path from 'path';
import mergeAllOf, {Options} from 'json-schema-merge-allof';
import {dereference, parse, JSONSchema,} from '@apidevtools/json-schema-ref-parser';
import minimist from 'minimist';
import {OpenApi, RequestBody, Response} from './Interfaces/OpenApi'

const defaultOptions: Options = {
    ignoreAdditionalProperties: true,
    resolvers: {
        defaultResolver: mergeAllOf.options.resolvers.title
    }
}
const argv = minimist(process.argv.slice(2));
if (!argv.s || !argv.o) {
    console.log('USAGE: ' + process.argv[1] + ' -s <input file> -o <output file> [-d]');
    process.exit(1);
}

const input = path.resolve(argv.s);


function mergeResponse(key: string, response: Response) {
    if (!response?.content || !('application/json' in response.content)) return

    let responseSchema = response.content['application/json']?.schema
    if (!responseSchema) return

    let mergedSchema = mergeAllOf(responseSchema, defaultOptions)
    if (mergedSchema)
        response.content['application/json'].schema = mergedSchema
}

function mergeRequestBody(requestBody: RequestBody) {
    let bodySchema = requestBody.content['application/json']?.schema
    if (!bodySchema) return

    let mergedSchema = mergeAllOf(bodySchema, defaultOptions)
    if (mergedSchema)
        requestBody.content['application/json'].schema = mergedSchema
}

function mergeAllOfInternal(oas: OpenApi, deref: boolean) {
    Object.entries(oas.paths).forEach(([_, path]) => {
        console.log(_);
        if (path.get) {
            console.log('GET')
            Object.entries(path.get.responses).forEach(([key, response]) => {
                mergeResponse(key, response)
            })
        }

        if (path.head) {
            console.log('HEAD')
            Object.entries(path.head.responses).forEach(([key, response]) => {
                mergeResponse(key, response)
            })
        }

        if (path.post) {
            console.log('POST')
            Object.entries(path.post.responses).forEach(([key, response]) => {
                mergeResponse(key, response);
            })
            if (path.post.requestBody) {
                mergeRequestBody(path.post.requestBody)
            }
        }

        if (path.patch) {
            console.log('PATCH')
            Object.entries(path.patch.responses).forEach(([key, response]) => {
                mergeResponse(key, response);
            })
            if (path.patch.requestBody) {
                mergeRequestBody(path.patch.requestBody)
            }
        }

        if (path.put) {
            console.log('PUT')
            Object.entries(path.put.responses).forEach(([key, response]) => {
                mergeResponse(key, response);
            })
            if (path.put.requestBody) {
                mergeRequestBody(path.put.requestBody)
            }
        }

        if (path.delete) {
            console.log('DELETE')
            Object.entries(path.delete.responses).forEach(([key, response]) => {
                mergeResponse(key, response);
            })
            if (path.delete.requestBody) {
                mergeRequestBody(path.delete.requestBody)
            }
        }

        if (typeof oas.components !== 'undefined' && oas.components) {
            if (deref) {
              // We have already dereferenced everything, don't need components in the output
              delete oas.components;
            } else {
                let components = oas.components;
                if (components.parameters)
                    Object.entries(components.parameters).forEach(([key, schema]) => {
                        components.parameters[key] = mergeAllOf(schema, defaultOptions)
                    })
                if (components.schemas)
                    Object.entries(components.schemas).forEach(([key, schema]) => {
                        components.schemas[key] = mergeAllOf(schema, defaultOptions)
                    })
                if (components.examples)
                    Object.entries(components.examples).forEach(([key, schema]) => {
                        components.examples[key] = mergeAllOf(schema, defaultOptions)
                    })
                if (components.responses)
                    Object.entries(components.responses).forEach(([key, schema]) => {
                        components.responses[key] = mergeAllOf(schema, defaultOptions)
                    })
                if (components.requestBodies)
                    Object.entries(components.requestBodies).forEach(([key, schema]) => {
                        components.requestBodies[key] = mergeAllOf(schema, defaultOptions)
                    })
                if (components.callbacks)
                    Object.entries(components.callbacks).forEach(([key, schema]) => {
                        components.callbacks[key] = mergeAllOf(schema, defaultOptions)
                    })
            }
        }
    });
}

function writeOutput(oas: OpenApi, outFile: string) {
    let output = path.resolve(outFile);
    let ext = path.parse(output).ext;
    if (ext === '.json') {
        let data = JSON.stringify(oas);
        writeFileSync(output, data, {encoding: 'utf8', flag: 'w'});
    } else if (ext.match(/^\.?(yaml|yml)$/)) {
        if (oas) {
            let yaml = require('node-yaml');
            yaml.writeSync(output, oas, { encoding: 'utf8', noRefs: true, lineWidth: -1})
        }
    } else {
        console.error(`Unrecognised output file type: ${output}`);
        process.exit(1);
    }
    console.log(`Wrote file: ${output}`);
}


if (argv.d) {

    // This option enables both "allOf" resolution and dereferencing

    dereference(input, {}, (err: Error | null, schema: JSONSchema | undefined) => {
        if (err) {
            console.error(err);
        } else {

            //we get an object which has OpenApi keys as properties, so we cast it here
            let openApiSchema: OpenApi = <OpenApi>schema;
            mergeAllOfInternal(openApiSchema,true);
            writeOutput(openApiSchema,argv.o);
        }
    });

} else {

    parse(input, {}, (err: Error | null, schema: JSONSchema | undefined) => {

        if (err) {
            console.error(err);
        } else {

            //we get an object which has OpenApi keys as properties, so we cast it here
            let openApiSchema: OpenApi = <OpenApi>schema;
            mergeAllOfInternal(openApiSchema,false);
            writeOutput(openApiSchema,argv.o);
        }

    });
}
