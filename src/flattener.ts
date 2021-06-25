import {writeFileSync} from 'fs';
import path from 'path';
import mergeAllOf from 'json-schema-merge-allof';
import {dereference, JSONSchema,} from 'json-schema-ref-parser';
import minimist from 'minimist';
import {OpenApi, RequestBody, Response} from './Interfaces/OpenApi'

const argv = minimist(process.argv.slice(2));
if (!argv.s || !argv.o) {
    console.log('USAGE: ' + process.argv[1] + ' -s <schema> -o <output> [...]');
    process.exit(1);
}

const input = path.resolve(argv.s);

function mergeResponse(key: string, response: Response) {
    if (!response?.content || !('application/json' in response.content)) return

    let responseSchema = response.content['application/json'].schema
    if (!responseSchema) return

    let mergedSchema = mergeAllOf(responseSchema, {ignoreAdditionalProperties: true})
    if (mergedSchema)
        response.content['application/json'].schema = mergedSchema
}

function mergeRequestBody(requestBody: RequestBody) {
    let bodySchema = requestBody.content['application/json']?.schema
    if (!bodySchema) return

    let mergedSchema = mergeAllOf(bodySchema, {ignoreAdditionalProperties: true})
    if (mergedSchema)
        requestBody.content['application/json'].schema = mergedSchema
}

dereference(input, {}, (err: Error | null, schema: JSONSchema | undefined) => {
    if (err) {
        console.error(err);
    } else {
        let openApiSchema: OpenApi = <OpenApi>schema;//we get an object which has OpenApi keys as properties, so we cast it here
        let output = path.resolve(argv.o);
        let ext = path.parse(output).ext;

        Object.entries(openApiSchema.paths).forEach(([id, path]) => {
            console.log(id)
            if (path.get) {
                console.log('GET')
                Object.entries(path.get.responses).forEach(([key, response]) => {
                    console.log(key)
                    mergeResponse(key, response)
                })
            }

            if (path.post) {
                console.log('POST')
                Object.entries(path.post.responses).forEach(([key, response]) => {
                    console.log(key)
                    mergeResponse(key, response);
                })
                mergeRequestBody(path.post.requestBody)
            }
        })

        Object.entries(openApiSchema.components.schemas).forEach(([key, schema]) => {
            openApiSchema.components.schemas[key] = mergeAllOf(schema, {ignoreAdditionalProperties: true})
        })
        Object.entries(openApiSchema.components.examples).forEach(([key, schema]) => {
            openApiSchema.components.examples[key] = mergeAllOf(schema, {ignoreAdditionalProperties: true})
        })
        Object.entries(openApiSchema.components.responses).forEach(([key, schema]) => {
            openApiSchema.components.responses[key] = mergeAllOf(schema, {ignoreAdditionalProperties: true})
        })
        if (ext === '.json') {
            let data = JSON.stringify(openApiSchema);
            writeFileSync(output, data, {encoding: 'utf8', flag: 'w'});
        } else if (ext.match(/^\.?(yaml|yml)$/)) {
            if (schema) {
                let yaml = require('node-yaml');
                yaml.writeSync(output, openApiSchema, {encoding: 'utf8'})
            }
        } else {
            console.error(`Unrecognised output file type: ${output}`);
            process.exit(1);
        }
        console.log(`Wrote file: ${output}`);
    }
});
