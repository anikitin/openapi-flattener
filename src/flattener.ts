#!/usr/bin/env node

import {writeFileSync, readFileSync} from 'fs';
import path from 'path';
import mergeAllOf, {Options} from 'json-schema-merge-allof';
import {dereference, parse, JSONSchema,} from '@apidevtools/json-schema-ref-parser';
import minimist from 'minimist';
import {OpenApi, Path, Operation, RequestBody, Response} from './Interfaces/OpenApi'

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


function mergeResponse(response: Response) {
    if (!response?.content || !('application/json' in response.content)) return

    let responseSchema = response.content['application/json']?.schema
    if (!responseSchema) return

    let mergedSchema = mergeAllOf(responseSchema, defaultOptions)
    if (mergedSchema)
        response.content['application/json'].schema = mergedSchema
}

function mergeRequestBody(requestBody: RequestBody) {
    if (!requestBody?.content || !('application/json' in requestBody.content)) return

    let bodySchema = requestBody.content['application/json']?.schema
    if (!bodySchema) return

    let mergedSchema = mergeAllOf(bodySchema, defaultOptions)
    if (mergedSchema)
        requestBody.content['application/json'].schema = mergedSchema
}

function mergeOperation(operation: Operation) {
    if (operation.responses)
        Object.entries(operation.responses).forEach(([key, response]) => {
            mergeResponse(response)
        })
    if (operation.requestBody) {
        mergeRequestBody(operation.requestBody)
    }
    if (operation.callbacks) {
        Object.entries(operation.callbacks).forEach(([key, callbackPaths]) => {
            console.log(key);
            Object.entries(callbackPaths).forEach(([id, callback]) => {
                console.log(id);
                mergePath(callback)
            })
        })
    }
}

function mergePath(path: Path) {
    if (path.get) {
        console.log('GET')
        mergeOperation(path.get)
    }

    if (path.head) {
        console.log('HEAD')
        mergeOperation(path.head)
    }

    if (path.post) {
        console.log('POST')
        mergeOperation(path.post)
    }

    if (path.patch) {
        console.log('PATCH')
        mergeOperation(path.patch)
    }

    if (path.put) {
        console.log('PUT')
        mergeOperation(path.put)
    }

    if (path.delete) {
        console.log('DELETE')
        mergeOperation(path.delete)
    }

}

function mergeAllOfInternal(oas: OpenApi, deref: boolean) {
    Object.entries(oas.paths).forEach(([_, path]) => {
        console.log(_);
        mergePath(path);

        if (typeof oas.components !== 'undefined' && oas.components) {
            if (deref) {
              // We have already dereferenced everything, don't need components in the output
              //delete oas.components;
            } else {
                let components = oas.components;
                // No complex schemas in parameters
                // if (components.parameters)
                //     Object.entries(components.parameters).forEach(([key, schema]) => {
                //         components.parameters[key] = mergeAllOf(schema, defaultOptions)
                //     })
                if (components.schemas)
                    Object.entries(components.schemas).forEach(([key, schema]) => {
                        components.schemas[key] = mergeAllOf(schema, defaultOptions)
                    })
                if (components.examples)
                    Object.entries(components.examples).forEach(([key, schema]) => {
                        components.examples[key] = mergeAllOf(schema, defaultOptions)
                    })
                if (components.responses)
                    Object.entries(components.responses).forEach(([key, response]) => {
                        mergeResponse(response)
                    })
                if (components.requestBodies)
                    Object.entries(components.requestBodies).forEach(([key, requestBody]) => {
                        mergeRequestBody(requestBody)
                    })
                if (components.callbacks)
                    Object.entries(components.callbacks).forEach(([key, callbackPaths]) => {
                      Object.entries(callbackPaths).forEach(([key, path]) => {
                        mergePath(path)
                      })
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
            yaml.writeSync(output, oas, { encoding: 'utf8', noRefs: true, lineWidth: -1, forceQuotes: true})
        }
    } else {
        console.error(`Unrecognised output file type: ${output}`);
        process.exit(1);
    }
    console.log(`Wrote file: ${output}`);
}


//if (argv.d) {

    // This option enables both "allOf" resolution and dereferencing

    dereference(input, { dereference: { circular: "ignore" } }, (err: Error | null, schema: JSONSchema | undefined) => {
        if (err) {
            console.error(err);
        } else {

            //we get an object which has OpenApi keys as properties, so we cast it here
            let openApiSchema: OpenApi = <OpenApi>schema;
            if (argv.m)
              mergeAllOfInternal(openApiSchema,true);
            writeOutput(openApiSchema,argv.o);
        }
    });

// It was supposed to support allOf-merging without dereferencing, but actually it does not work
// } else {

//     parse(input, {}, (err: Error | null, schema: JSONSchema | undefined) => {

//         if (err) {
//             console.error(err);
//         } else {

//             //we get an object which has OpenApi keys as properties, so we cast it here
//             let openApiSchema: OpenApi = <OpenApi>schema;
//             mergeAllOfInternal(openApiSchema,false);
//             writeOutput(openApiSchema,argv.o);
//         }

//     });
// }
