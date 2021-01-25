import 'reflect-metadata';
import { createConnection, getMongoRepository } from 'typeorm';
import Attribute from '../models/Attribute';
import { query } from './sparql';

const strip_langtag = (label: string) =>
    label.replace(/@[a-z]+/, '');

const attribute_props_by_range = (range?: string): Partial<Attribute> => {
    if (!range)
        return { type: 'string' };
    if (range.match(/^dbo:/))
        return { type: 'resource' };
    switch (range) {
    case 'xsd:nonNegativeInteger': case 'xsd:positiveInteger': case 'dt:inhabitantsPerSquareKilometre':
        return { type: 'number', float: false, min: 0 };
    case 'xsd:integer': case 'xsd:gYear':
        return { type: 'number', float: false };
    case 'xsd:string': case 'rdf:langString': case 'dt:engineConfiguration': case 'http://www.w3.org/2004/02/skos/core#Concept': case 'wgs84:SpatialThing': case 'http://www.w3.org/2004/02/skos/core#OrderedCollection':
        return { type: 'string' };
    case 'xsd:anyURI':
        return { type: 'resource' };
    case 'xsd:date': case 'xsd:dateTime': case 'xsd:gYearMonth': case 'dt:valvetrain':
        return { type: 'date' };
    case 'xsd:boolean':
        return { type: 'boolean' };
    case 'xsd:double': case 'xsd:float': case 'dt:kilowatt':
        return { type: 'number', float: true };
    default:
        return { type: 'number', float: true, min: 0 };
    }
};

(async () => {
    await createConnection();

    // dbo Attributes have a rdfs:domain if they dont belong to the base class owl:Thing itself.
    // In that case, they are probably moot data and need to be revised, but
    // will now be retrieved either way.
    const sql = `
        select distinct ?subject ?category ?label ?comment ?range {
            { ?subject rdf:type owl:DatatypeProperty } UNION { ?subject rdf:type owl:ObjectProperty } .
            OPTIONAL {
                ?subject rdfs:domain ?category
            } .
            OPTIONAL {
                ?subject rdfs:label ?label
                FILTER(LANGMATCHES(LANG(?label), "en"))
            } .
            OPTIONAL {
                ?subject rdfs:comment ?comment
                FILTER(LANGMATCHES(LANG(?comment), "en"))
            } .
            OPTIONAL { ?subject rdfs:range ?range } .
        }`;
    const results = await query(sql);

    const attributes = results
        .map((result) => {
            result.subject = result.subject.replace(/\//g, '_').replace(/^dbo:(.+)/, '$1');
            if (result.category) {
                result.category = result.category.replace(/^dbo:(.+)/, '$1');
                result.category = result.category[0].toLowerCase() + result.category.slice(1);
            } else {
                result.category = 'thing';
            }
            // if (!result.subject.match(/^[dbo:a-zA-Z0-9]+$/) || !result.category.match(/^dbo:[a-zA-Z0-9]+$/))
            //     throw new Error('unexpected character in result ' + result.subject + ', ' + result.category);
            if (result.label)
                result.label = strip_langtag(result.label);
            else
                result.label = result.subject;
            const label_unit_match = result.label.match(/^(.+) \((.+)\)\s*$/);
            if (label_unit_match) {
                result.label = label_unit_match[1];
                result.unit = label_unit_match[2];
            }
            if (result.comment)
                result.comment = strip_langtag(result.comment);
            return result;
        }).map((p) => {
            const a = new Attribute({
                category: p.category,
                name: p.subject,
                label: p.label,
                range: p.range,
                ...attribute_props_by_range(p.range),
                source: 'dbpedia',
            });
            if (p.comment)
                a.description = p.comment;
            if (p.unit)
                a.unit = p.unit;
            return a;
        });

    console.log("retrieving interest values");
    let i = 0;
    for(const attribute of attributes) {
        const response = await query(`
        select count(distinct ?product) as ?interest {
            ?product dbo:${attribute.name} ?v
        }`, undefined, true);
        console.log(Math.round(i++/attributes.length*100)/100);
        attribute.interest = Number(response[0].interest);
    }

    attributes.push(new Attribute({
        category: 'thing',
        name: 'label',
        label: 'Name',
        type: 'string',
        verified: true,
    }));
    // todo now duplicate
    attributes.push(new Attribute({
        category: 'thing',
        name: 'thumbnail',
        label: 'Image',
        type: 'resource',
        verified: true,
    }));
    attributes.push(new Attribute({
        category: 'thing',
        name: 'depiction',
        label: 'Picture',
        type: 'resource',
        verified: true,
    }));

    // TODO ...
    attributes
        .filter(a => ["thumbnail","depiction","label","wikiPageRedirects"].includes(a))
        .forEach(a => a.interest = 0)

    // console.log(attributes);

    console.info('Deleting all attributes');
    await getMongoRepository(Attribute).deleteMany({});

    // console.log([...new Set(attributes.map(a => a.range).filter((r): r is string => !!r).filter(range => !range.match(/^dbo:/)))]);

    console.info('Adding attributes');
    // console.debug(attributes);
    await Attribute.save(attributes);

    process.exit(0);
})();

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    process.exit(2);
});
