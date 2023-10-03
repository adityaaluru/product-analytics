import fs from "fs/promises";
import neo4j from "neo4j-driver";
import nReadlines from "n-readlines";

//Neo4j
const URI = 'neo4j+s://c692095c.databases.neo4j.io'
const USER = 'neo4j'
const PASSWORD = 'S9FZesHQALoOcO0hqIj2t-oZHAtu4DLpVY_NwT7CQzo'
const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD))

//File Reader
//const productVectorLines = new nReadlines('sample-embeddings.csv');
const productVectorLines = new nReadlines('../embeddings/embeddings.csv');
let skipLines = 0;
var args = process.argv ;

if(args.length > 2){
    skipLines = parseInt(args[2])
}


const indexProductVectorInBulk = async (productVectors) => {
    const resultsCat = await driver.executeQuery(
        "UNWIND $productVectors as productVector\
        MATCH (p:Product {id: productVector.id})\
        CALL db.create.setVectorProperty(p, 'openai_vector', productVector.vector) YIELD node\
        RETURN node.id",
        {productVectors: productVectors}
    )
    //console.log("Query results: "+JSON.stringify(resultsCat))
    return resultsCat
}

const getVector = (line) => {
const productVector = {}
let index = line.indexOf(",");
productVector.id = ""+line.slice(0,index)
productVector.vector = JSON.parse("["+line.slice(index+2,line.length-2)+"]")
//console.log(productVector.id+"||"+productVector.vector.length)
return productVector
}

try {
    /***** CREATE INDICES */
    console.log("Creating vector index (only for the first time...)")
    //Check before creating
    //await driver.executeQuery("CALL db.index.vector.createNodeIndex('openai_vectors', 'Product', 'openai_vector', 1536, 'cosine')")
    console.log("Done!")

    /***** START PROCESSING */

    //Readline from the large file - for every 100 lines make a call to indexProductVectorInBulk
    
    let line;
    let lineNumber = 0;
    let absoluteLineNumber = 0;
    let productVectors = [];
    
    console.log('****** Starting file processing...');
    
    //ignore first line which is the csv header
    line = productVectorLines.next()

    //start processing next lines
    while (line = productVectorLines.next()) {
        lineNumber++;
        absoluteLineNumber++;
        if(skipLines > absoluteLineNumber){
            continue;
        }
        productVectors.push(getVector(line))
        if(lineNumber>=500){
            lineNumber = 0;
            await indexProductVectorInBulk(productVectors)
            console.log("Updated "+absoluteLineNumber+" products to neo4j...")
            productVectors = []
        }
    }
    console.log('****** Reached end of file!');
    console.log("Sending last set of "+productVectors.length+" products to neo4j...")
    await indexProductVectorInBulk(productVectors)

} catch (err) {
  console.error("Error: "+err);
}
const used = process.memoryUsage().heapUsed / 1024 / 1024;
console.log(`The script used approximately ${Math.round(used * 100) / 100} MB`);

await driver.close()