import express from 'express';
import { UNPROCESSABLE_ENTITY } from 'http-status-codes';
import { getMongoManager } from 'typeorm';
import Category from '../models/Category';
import Product from '../models/Product';

const search_router = express.Router();

search_router.get('/', async (req, res) => {
    const query = req.query.query + "";
    if (!query)
        return res.status(UNPROCESSABLE_ENTITY).send('Query param query missing');
    const query_conditions = query
        .split(/\s+/)
        .filter(q => ! q.match(/^-/))
        .map(q => q.replace(/[^a-zA-Z]g/, ''))
        .filter(Boolean)
        .map(q => q.toLowerCase());
    const query_quotes_applied = query
        .split(/\s+/)
        .map(q => `"${q}"`)
        .join(' ');
    
    const manager = getMongoManager();
    let cursor = manager.createCursor(Product, {
        $text: { $search: query_quotes_applied }
    }).project({
        score: { $meta: 'textScore' }
    }).sort({
        score: {
            $meta: 'textScore'
        }
    }).limit(250);
    const products: Product[] = await cursor.toArray();
    const products_searchresult = products.map(product => {
        let display_name = product.data.label.value;
        if( ! query_conditions.some(condition => (<string>product.data.label.value).toLowerCase().includes(condition))) {
            const alias = product.aliases?.find(alias => query_conditions.some(condition => alias.toLowerCase().includes(condition)));
            if(alias)
                display_name = `${product.data.label.value} (${alias})`;
        }
        return {
            name: product.name,
            display_name,
            thumbnail: product.data.thumbnail?.value,
            // @ts-ignore
            score: Math.round(product.score*10)/10,
        }
    });

    cursor = manager.createCursor(Category, {
        $text: { $search: query_quotes_applied },
        $or: [
            { wrapper: false },
            { wrapper: { $not: { $exists: true } } },
        ]
    }).project({
        score: { $meta: 'textScore' }
    }).sort({
        score: {
            $meta: 'textScore'
        }
    }).limit(50);
    const categories: Category[] = await cursor.toArray();
    const categories_searchresult = categories.map(category => {
        let display_name = category.label;
        let alias = undefined;
        if( ! query_conditions.some(condition => category.label.toLowerCase().includes(condition))) {
            alias = category.aliases?.find(alias => query_conditions.some(condition => alias.toLowerCase().includes(condition)));
        }
        return {
            name: category.name,
            display_name,
            alias,
            // @ts-ignore
            score: Math.round(category.score*10)/10,
        }
    });
    // Finds by aliases should come last
    categories_searchresult.sort((a, b) => a.display_name.indexOf('(') - b.display_name.indexOf('('));

    return res.send({
        categories: categories_searchresult,
        products: products_searchresult,
    });
});

export default search_router;
