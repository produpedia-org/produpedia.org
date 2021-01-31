import { IsNotIn, IsUrl, IsString, IsOptional, Length } from 'class-validator';
import { BaseEntity, Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { AttributeType } from './Attribute';

export type ProductDatumValue = AttributeType | AttributeType[];
export type ProductDatumResource = string | null | Array<string | null>;

// todo prevent instantiation AND saving, only derived allowed
@Entity()
class ProductDatum extends BaseEntity {
    @ObjectIdColumn()
    public _id!: ObjectID;
    @Column()
    @IsOptional()
    @IsString()
    public user!: string; // objid or username? todo. + -> valid constraint
    @Column()
    @IsNotIn([undefined])
    public value!: ProductDatumValue;
    @Column()
    public source!: string; // todo: collaborative array (maybe)
    @Column()
    @IsOptional()
    @Length(1, 255, { each: true })
    /** In the case of attribute of type 'resource', the value will hold the label
     * (so that you can query it properly), and this field will contain some resource
     * identifier (if source==dbpedia/wikipedia) or link */
    public resource?: ProductDatumResource;

}

export default ProductDatum;
