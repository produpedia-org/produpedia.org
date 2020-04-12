import { IsBoolean, Length, IsOptional, IsObject, IsUrl } from 'class-validator';
import { BaseEntity, Column, Entity, ObjectIdColumn } from 'typeorm';
import PrimaryProductDatum from './PrimaryProductDatum';
import { ObjectID } from 'mongodb';

interface PrimaryProductData {
    [attribute_id: string]: PrimaryProductDatum;
}

@Entity()
class Product extends BaseEntity {
    @ObjectIdColumn()
    @IsOptional()
    public _id!: ObjectID;
    @Column()
    @Length(3, 20)
    public subject!: string; // objectid?
    @Column()
    @Length(3, 255) // todo revert to 1
    public name!: string;
    @Column()
    @IsBoolean()
    public verified: boolean = false;
    /** {attribute_id: datum} */
    @Column()
    @IsOptional()
    @IsObject()
    public data!: PrimaryProductData; // todo nested validation
    // FIXME user and source and maybe put these two (three? plus verified) into some interface
    @Column()
    @IsUrl()
    public source!: string;

    public constructor(init: Partial<Product>) {
        super();
        Object.assign(this, init);
    }

}

export default Product;
