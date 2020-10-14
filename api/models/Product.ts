import { IsBoolean, Length, IsOptional, IsObject, IsUrl, IsArray, IsString } from 'class-validator';
import { BaseEntity, Column, Entity, ObjectIdColumn } from 'typeorm';
import PrimaryProductDatum from './PrimaryProductDatum';
import { ObjectID } from 'mongodb';

export interface PrimaryProductData {
    [attribute_name: string]: PrimaryProductDatum;
}

@Entity()
class Product extends BaseEntity {
    @ObjectIdColumn()
    @IsOptional()
    public _id!: ObjectID;
    @Column()
    @IsArray()
    @Length(1, 255, { each: true }) // todo test, and other files
    public categories!: string[];
    @Column()
    @Length(1, 255)
    public name!: string;
    @Column()
    @IsArray()
    @IsOptional()
    @Length(1, 255, { each: true })
    /** Alternative labels */
    public aliases?: string[];
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
    @IsString()
    @IsOptional()
    public source!: string;

    public constructor(init: Partial<Product>) {
        super();
        Object.assign(this, init);
    }

}

export default Product;
