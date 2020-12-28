import 'reflect-metadata';
import { createConnection, getMongoRepository } from 'typeorm';
import { readFileSync } from 'fs';
import Category from '../models/Category';

const strip_langtag = (label: string) =>
    label.replace(/@[a-z]+/, '');

interface CategoryTreeNode extends Category {
    children?: CategoryTreeNode[];
    additional_parents?: string[];
}

const base_categories: CategoryTreeNode[] = JSON.parse(readFileSync('/b/ls/data/categories.json', 'utf-8'));

(async () => {
    await createConnection();

    const categories: Category[] = [];
    const flatten = (cat: CategoryTreeNode) => {
        for (const child of cat.children || []) {
            if (!child.parents)
                child.parents = [];
            child.parents.push(cat.name);
            flatten(child);
        }
        cat.label = strip_langtag(cat.label || cat.name);
        cat.parents.push(...cat.additional_parents||[]);
        delete cat.children;
        delete cat.additional_parents;
        categories.push(new Category(cat));
    };
    for(const base_category of base_categories) {
        base_category.parents = [];
        flatten(base_category);
    }

    // console.log(JSON.stringify(categories, null, 4));

    console.info('Deleting all categories');
    await getMongoRepository(Category).deleteMany({});

    console.info('Adding categories');
    // console.debug(categories);
    await Category.save(categories);

    process.exit(0);
})();

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    process.exit(2);
});
