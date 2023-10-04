import axios from "axios";
import neo4j from "neo4j-driver";

//Input arguments
var inputString = "Men's footwear" ;
const args = process.argv;

if(args.length > 2){
    inputString = args.slice(2).join(' ')
}

//Neo4j
const URI = 'neo4j+s://c692095c.databases.neo4j.io'
const USER = 'neo4j'
const PASSWORD = 'S9FZesHQALoOcO0hqIj2t-oZHAtu4DLpVY_NwT7CQzo'
const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD))

//OpenAI
const OPENAI_KEY = 'Bearer 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'

const openaiClient = axios.create({
    baseURL: 'https://api.openai.com/v1/',
    timeout: 5000,
    headers: {'Content-Type': 'application/json',
'Authorization': OPENAI_KEY}
  });



const getEmbedding = async (inputString) => {
    let response = {};
    const apiRes = await openaiClient.post('/embeddings',{
        input: inputString,
        model: "text-embedding-ada-002"
    })
    if(apiRes.status === 200){
        const data = apiRes.data.data;
        if(data.length>0){
            response.vector = data[0].embedding;
        }
        response.usage = apiRes.data.usage;
    }
    return response;
}
const semanticQuery = async (queryVector,resultCount=10) => {
    const results = []
    const { records, summary } = await driver.executeQuery(
        "CALL db.index.vector.queryNodes('openai_vectors', $resultCount, $queryVector)\
        YIELD node AS product, score\
        RETURN product.id AS id, product.title AS title, product.description as description,score",
        {queryVector: queryVector,
        resultCount: resultCount}
    )
    records.forEach((record)=> {
        const result = {}
        if(record.get('id')){
            result.id = record.get('id')
        }
        if(record.get('title')){
            result.title = record.get('title')
        }
        if(record.get('description')){
            result.description = record.get('description')
        }
        if(record.get('score')){
            result.score = record.get('score')
        }
        results.push(result)
    })
    //console.log("Query results: "+JSON.stringify(resultsCat))
    return results;
}

try {
    console.log("Getting embeddings for input string...")
    const embeddingResponse = await getEmbedding(inputString)
    console.log("Embedding usage: "+JSON.stringify(embeddingResponse?.usage))
    const searchResults = await semanticQuery(embeddingResponse.vector)
    console.log(`*** Search Results for "${inputString}"`)
    console.log(JSON.stringify(searchResults,null,2))
} catch (err) {
    console.error("Error: "+err);
}
await driver.close()