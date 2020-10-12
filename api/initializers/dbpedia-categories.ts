import 'reflect-metadata';
import { createConnection, getMongoRepository } from 'typeorm';
import { readFileSync } from 'fs';
import Category from '../models/Category';

const strip_langtag = (label: string) =>
    label.replace(/@[a-z]+/, '');

interface CategoryTreeNode extends Category {
    count: number;
    children?: CategoryTreeNode[];
}

const tree: CategoryTreeNode = JSON.parse(readFileSync('/b/ls/dbpedia_import/categories_4.json', 'utf-8'));
tree.parents = [];

(async () => {
    await createConnection();

    console.info('Deleting all categories');
    // @ts-ignore
    await getMongoRepository(Category).deleteMany({});

    const categories: Category[] = [];
    const flatten = (cat: CategoryTreeNode) => {
        for (const child of cat.children || []) {
            if (!child.parents)
                child.parents = [];
            child.parents.push(cat.name);
            flatten(child);
        }
        cat.label = strip_langtag(cat.label || cat.name);
        delete cat.children;
        delete cat.count;
        categories.push(new Category(cat));
    };
    flatten(tree);

    // console.log([...new Set(attributes.map(a => a.range).filter((r): r is string => !!r).filter(range => !range.match(/^dbo:/)))]);

    console.info('Adding categories');
    // console.debug(categories);
    await Category.save(categories);

    process.exit(0);
})();

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    process.exit(2);
});
