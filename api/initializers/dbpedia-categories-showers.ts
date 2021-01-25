import 'reflect-metadata';
import { createConnection, FindOptions } from 'typeorm';
import Attribute from '../models/Attribute';
import Category from '../models/Category';
import Product from '../models/Product';
import { get_category_anchestors, get_category_children } from '../routers/category-router';

let lineno = 0;

(async () => {
    await createConnection();

    console.info('Lookup all catgories');
    const categories = await Category.find({ $or: [ {wrapper:false}, {wrapper:{$not:{$exists:true}}} ] } as FindOptions<Category>);

    let i=0;
    for(const category of categories) {
        i++;
        const category_attributes = await Attribute.find({
            category: { $in: [
                category.name,
                ...(await get_category_anchestors(category)).map(c => c.name),
            ]}
        });
        const category_attribute_names = category_attributes.map(a => a.name);
        const category_family_names = [
            category.name,
            ...(await get_category_children(category)).map(c => c.name),
        ];
        const category_products = await Product.find({ 
            categories: { $in: category_family_names } as any
        });
        interface INumberByString {
            [k: string]: number
        }
        const count_by_attribute_name: INumberByString = category_products
            .map(product => Object.keys(product.data))
            .flat()
            .filter(attribute_name => ! ["thumbnail","depiction","label","wikiPageRedirects"].includes(attribute_name))
            // Do *not* filter foreign categories' attributes out, instead do so in product-router search handler
            // because the attribute-category relations and category nesting may change all the time. By also
            // including the invalid ones here, category.showers *only* depends on an analysis of the category's
            // product's product_data
            // .filter(attribute_name => category_attribute_names.includes(attribute_name))
            .reduce((all: INumberByString, attribute_name: string) => {
                all[attribute_name] = ++all[attribute_name] || 1
                return all
            }, {})
        const category_attributes_sorted = Object.entries(count_by_attribute_name)
            .filter(e => e[1] > 0)
            .sort((a, b) => b[1] - a[1])
            .map(e => e[0]);
        category.showers = category_attributes_sorted;
        console.log(Math.round(i/categories.length*100), "%", category.name, category_products.length, "products,", category_attributes_sorted.length, "showers");
        await category.save();
    }
    process.exit(0);
})();

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    console.log('lineno', lineno);
    process.exit(2);
});
