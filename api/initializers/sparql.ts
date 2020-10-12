import fetch  from 'node-fetch';

// TODO: use some npm spql library instead(?)

const prefixes = [
    { resource: 'http://dbpedia.org/ontology/', shorty: 'dbo:' },
    { resource: 'http://dbpedia.org/resource/', shorty: 'dbr:' },
    { resource: 'http://dbpedia.org/property/', shorty: 'dbp:' },
    { resource: 'http://dbpedia.org/datatype/', shorty: 'dt:' },
    { resource: 'http://www.w3.org/2001/XMLSchema#', shorty: 'xsd:' },
    { resource: 'http://www.w3.org/2002/07/owl#', shorty: 'owl:' },
    { resource: 'http://www.wikidata.org/entity/', shorty: 'wikidata:' },
    { resource: 'http://dbpedia.org/class/yago/', shorty: 'yago:' },

    { resource: 'http://purl.org/dc/terms/', shorty: 'dct:' },
    { resource: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', shorty: 'rdf:' },
    { resource: 'http://www.w3.org/2000/01/rdf-schema#', shorty: 'rdfs:' },
    { resource: 'http://purl.org/linguistics/gold/', shorty: 'gold:' },
    { resource: 'http://xmlns.com/foaf/0.1/', shorty: 'foaf:' },
    { resource: 'http://www.w3.org/2003/01/geo/wgs84_pos#', shorty: 'wgs84:' },
    { resource: 'http://www.w3.org/ns/prov#', shorty: 'prov:' },
    { resource: 'http://www.georss.org/georss/', shorty: 'georss:' },

    { resource: 'http://www.ontologydesignpatterns.org/ont/dul/DUL.owl#', shorty: 'dul:' },
    { resource: 'http://schema.org/', shorty: 'sdo:' },
    { resource: 'http://umbel.org/umbel/rc/', shorty: 'umbelrc:' },

    { resource: 'http://purl.org/linguistics/gold/', shorty: 'gold:' },
];

const prefix_resource = (entity: string) => {
    let ret = entity;
    for (const { resource, shorty } of prefixes)
        ret = ret.replace(resource, shorty);
    return ret;
};

const sparql_prefixes = prefixes
    .map(prefix => `PREFIX ${prefix.shorty} <${prefix.resource}>`)
    .join('\n');

export const sparql_uri_escape = (uri: string) =>
    uri.replace(/([,()+'/&.])/g, '\\$1');

export const query = async (raw_sql: string, base_uri: string = 'http://store:8890', quiet = false): Promise<{ [prop: string]: string }[]> => {
    if (!quiet) console.debug('querying...');
    // if (raw_sql.includes('http')) {
    //     console.warn(raw_sql);
    //     console.warn('query includes \'http\'');
    //     process.exit(44);
    //     // # await readLine 'continue...'
    // }

    const format = encodeURIComponent('application/sparql-results+json');
    // # format = encodeURIComponent "text/csv"
    const timeout = 100000000; // # 10000
    // # default_graph_uri = encodeURIComponent "http://dbpedia.org"
    const default_graph_uri = '';
    // # base_uri = "https://dbpedia.org"
    // # base_uri = "http://localhost:8891"
    // # base_uri = "http://store:8890"
    // # query = "select * { ?s ?o ?p . } limit 10"
    const sql = encodeURIComponent(`${sparql_prefixes}\n${raw_sql}`);

    const url = `${base_uri}/sparql?default-graph-uri=${default_graph_uri}&format=${format}&CXML_redir_for_subjs=121&CXML_redir_for_hrefs=&timeout=${timeout}&debug=on&run=+Run+Query+`;
    const resp = await fetch(url, {
        method: 'POST',
        body: `query=${sql}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
    });

    let json;
    try {
        json = await resp.json();
    } catch (e) {
        console.error(raw_sql);
        // # console.error(red await resp.text() # throws with deno 1.0 idk)
        console.error(JSON.stringify(resp));
        throw new Error('is not json');
    }
    const results = json.results.bindings.map((row: { [prop: string]: any }) => {
        const t: { [prop: string]: string } = {};
        for (const prop of Object.keys(row)) {
            const value = row[prop];
            t[prop] = prefix_resource(value.value);
            if (value['xml:lang'])
                t[prop] += `@${value['xml:lang']}`;
            // if (value.datatype && value.type !== 'uri' && ! ['http://www.w3.org/1999/02/22-rdf-syntax-ns#langString', 'http://www.w3.org/2001/XMLSchema#integer', 'http://www.w3.org/2001/XMLSchema#double', 'http://www.w3.org/2001/XMLSchema#date'].includes(value.datatype))
            //     t[prop] += `[[${prefix_resource(value.datatype)}]]`;
            // # if t[prop].includes 'http'
            // #     console.warn(magenta "#{t[prop]} includes 'http' even after prefixing")
            // #     await readLine 'continue...' # doesnt work in this spot, for some reason
            // #     # Deno.exit()
        }
        return t;
    });
    if (!quiet) console.debug(` ${results.length} results returned`);

    if (resp.headers.has('X-SPARQL-MaxRows')) {
        console.warn('X-SPARQL-MaxRows is set: Return size exceeded return size. This output is truncated.');
        // await readLine 'continue...'
        process.exit(45);
    }
    return results;
};
