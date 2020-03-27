import { IsBoolean } from 'class-validator';
import { Column, Entity } from 'typeorm';
import { AttributeType } from './Attribute';
import ProductDatum from './ProductDatum';

@Entity()
class PrimaryProductDatum extends ProductDatum {
    @Column()
    @IsBoolean()
    public verified: boolean = false;

    public constructor(init: Partial<PrimaryProductDatum>) {
        super();
        Object.assign(this, init);
    }

}

export default PrimaryProductDatum;
