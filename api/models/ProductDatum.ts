import { IsNotIn, IsUrl, IsString, IsOptional } from 'class-validator';
import { BaseEntity, Column, Entity, ObjectID, ObjectIdColumn } from 'typeorm';
import { AttributeType } from './Attribute';

export type ProductDatumValue = AttributeType | null;

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

}

export default ProductDatum;
