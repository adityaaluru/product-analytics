# product-analytics

This repo contains code to perform the following:

1. Index an open source product data from Kaggle into neo4j

`node local`

2. Index the vector embeddings provided for each product

`node index-vector`

3. API to perform kNN search for products (and get their categories)

`node semantic-search "What can I buy as gifts for my boys"`

# TO BE DONE
4. API to find the best category for a given product title, description
5. API to re-catalog the product set, based on a new category tree structure provided by the user