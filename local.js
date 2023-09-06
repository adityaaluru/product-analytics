import fs from "fs/promises";
import neo4j from "neo4j-driver";

//Neo4j
const URI = 'neo4j+s://c692095c.databases.neo4j.io'
const USER = 'neo4j'
const PASSWORD = 'S9FZesHQALoOcO0hqIj2t-oZHAtu4DLpVY_NwT7CQzo'
const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD))


const getAttributes = (productAttr) => {
    const attributes = {};
    for(let item of productAttr){
        for(let attribute in item){
            attributes[attribute] = item[attribute]
        }
    }
    return attributes
}
const getProduct = (eachProduct) => {
    const product = {}
    product.id = eachProduct.pid;
    product.title = eachProduct.title
    product.description = eachProduct.description

    product.category = eachProduct.category
    product.subCategory = eachProduct.sub_category

    product.seller = eachProduct.seller;
    product.brand = eachProduct.brand

    product.rating = isNaN(Number(eachProduct.average_rating))?0:Number(eachProduct.average_rating);
    product.price = isNaN(Number(eachProduct.selling_price.replace(",","")))?0:Number(eachProduct.selling_price.replace(",",""));
    product.attributes = getAttributes(eachProduct.product_details);

    return product
}
const saveProduct = async (product) => {
    const resultsCat = await driver.executeQuery(
        'MERGE (p:Product {id: $id})\
        MERGE (sc:Category {id: $subCategory})\
        MERGE (c:Category {id: $category})\
        MERGE (sc)-[s:PART_OF]->(c)\
        MERGE (p)-[r:BELONGS_TO]->(sc)\
        ON CREATE\
            SET p.title = $title\
            SET p.description = $description\
            SET p.price = $price\
            SET p.rating = $rating',
        product
    )
}

const saveProductInBulk = async (products) => {
    const resultsCat = await driver.executeQuery(
        'UNWIND $products as product\
        MERGE (p:Product {id: product.id})\
        MERGE (sc:Category {id: product.subCategory})\
        MERGE (c:Category {id: product.category})\
        MERGE (sc)-[s:PART_OF]->(c)\
        MERGE (p)-[r:BELONGS_TO]->(sc)\
        ON CREATE\
            SET p.title = product.title\
            SET p.description = product.description\
            SET p.price = product.price\
            SET p.rating = product.rating',
        {products: products}
    )
}

try {
    /***** CREATE INDICES */
    console.log("Creating indices...")
    await driver.executeQuery(
        'CREATE INDEX product_index IF NOT EXISTS\
        FOR (p:Product) ON (p.id)'
    )
    await driver.executeQuery(
        'CREATE INDEX category_index IF NOT EXISTS\
        FOR (c:Category) ON (c.id)'
    )
    console.log("Done!")

    /***** START PROCESSING */

    const input = await fs.readFile('./flipkart_fashion_products_dataset.json', 'utf8');
    const inputProducts = JSON.parse(input)
    let chunkSize = 1000

    let products = []
    let i = 0;
    for(let eachProduct of inputProducts){
        const product = getProduct(eachProduct);
        products.push(product)
        if(products.length===chunkSize){
            console.log("Saving chunk(size:"+chunkSize+") from "+(i*chunkSize)+" to "+((i+1)*chunkSize))
            await saveProductInBulk(products)
            products = []
            i++;
            console.log("Continuing with chunk#: "+i)
        }
    }
    if(products.length>0){
        console.log("Saving LAST chunk...")
        await saveProductInBulk(products)
        i++
    }
    console.log("***** Total chunks processed: "+i)
} catch (err) {
  console.error(err);
}
await driver.close()