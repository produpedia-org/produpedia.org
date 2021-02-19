import 'reflect-metadata';
import { createConnection } from 'typeorm';
import Category from '../models/Category';
import { query } from './sparql';

const subject_to_name = (subject: string) => {
    if (!subject)
        return '';
    const clean = subject.replace(/^db[or]:/,'');
    return clean[0].toLowerCase() + clean.slice(1);
}

(async () => {
    await createConnection();

    const categories = await Category.find();

    console.info('Finding more categories by hypernyms');
    const results = await query(`select ?hypernym ?label count(?s) as ?count {
            ?s gold:hypernym ?hypernym .
            ?hypernym rdfs:label ?label .
        }
        order by desc(?count)
        limit 3000`);
    const finds = results
        .map(r => ({
            name: subject_to_name(r.hypernym),
            hypernym: r.hypernym,
            label: r.label,
            count: Number(r.count),
        }))
        .filter(r => {
            const match = categories.find(c => c.name === r.name || c.aliases?.includes(r.name));
            // console.log(match || r.hypernym);
            return !match;
        });
    
    for(const find of finds) {
        const hypernym_uri = `<http://dbpedia.org/resource/${find.hypernym.replace(/^dbr:/,'')}>`;

        const redirect_of = (await query(`
            select ?subject {
                ?subject dbo:wikiPageRedirects ${hypernym_uri} .
            }
            limit 500
        `, undefined, true))
        .map(r => subject_to_name(r.subject));

        if(categories.find(c => redirect_of.includes(c.name) || redirect_of.some(r => c.aliases?.includes(r))))
            continue;

        const most_used_types = (await query(`
            select ?type count(distinct ?subject) as ?count {
                ?subject gold:hypernym ${hypernym_uri} .
                ?subject a ?type .
            }
            group by ?type
            having(count(distinct ?subject) > ${Math.round(find.count*0.01)})
            order by desc(?count)
        `, undefined, true)).filter(type => type.type.match(/^dbo:/));
        const coverage_top = Number(most_used_types[0]?.count) / find.count;
        const coverage_all = Number(most_used_types.reduce((all:number,type:any)=>all+Number(type.count),0)) / find.count;

        const sample_products = (await query(`
            select ?subject {
                ?subject gold:hypernym ${hypernym_uri} .
                ?subject rdfs:label ?currentExistingWikiArticle .
                filter ( not exists { ?subject dbo:wikiPageRedirects ?redirect } ) .
            }
            order by rand()
            limit 30
        `, undefined, true)).map(r => subject_to_name(r.subject));

        let sample_products_currently_missing: string[] = [];
        if(most_used_types.length) {
            sample_products_currently_missing = (await query(`
                select ?subject {
                    ?subject gold:hypernym ${hypernym_uri} .
                    ?subject rdfs:label ?currentExistingWikiArticle .
                    filter ( not exists { ?subject dbo:wikiPageRedirects ?redirect } ) .
                    filter not exists {
                        ?subject a ${most_used_types[0].type}
                    }
                }
                order by rand()
                limit 30
            `, undefined, true))
            .map(r => subject_to_name(r.subject))
        }

        console.log(JSON.stringify({
            name: find.name,
            parents: [ subject_to_name(most_used_types[0]?.type) ],
            count: find.count,
            coverage_top: Math.round(coverage_top*100)/100,
            coverage_all: Math.round(coverage_all*100)/100,
            redirect_of,
            most_used_types,
            hypernym: find.hypernym,
            label: find.label,
            sample_products_currently_missing,
            sample_products,
        }));
    }
    process.exit(0);
})();

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    process.exit(2);
});
