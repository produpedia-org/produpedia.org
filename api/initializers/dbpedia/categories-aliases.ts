import 'reflect-metadata';
import { createConnection, FindOptions } from 'typeorm';
import Category from '../models/Category';
import { query } from './sparql';

let lineno = 0;

(async () => {
    await createConnection();

    console.info('Lookup all catgories');
    const categories = await Category.find({ $or: [ {wrapper:false}, {wrapper:{$not:{$exists:true}}} ] } as FindOptions<Category>);

    let i=0;
    for(const category of categories) {
        i++;

        const category_resource_name = category.name[0].toUpperCase() + category.name.slice(1);
        const results = await query(`
            select ?redirectLabel {
                ?redirect dbo:wikiPageRedirects <http://dbpedia.org/resource/${category_resource_name}> .
                ?redirect rdfs:label ?redirectLabel
            }`);
        const aliases = results
            .map(r => r.redirectLabel.replace(/@[a-z]+/,''))
        console.log(Math.round(i/categories.length*100), "%", category.name, aliases.length, "aliases");
        category.aliases = [...new Set([
            ...(category.aliases||[]),
            ...aliases
        ])];
        await category.save();
    }
    process.exit(0);
})();

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    console.log('lineno', lineno);
    process.exit(2);
});
