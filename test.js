let price = "1,222"
let rating = "3.9"
const result = {}
result.rating = Number(rating)
result.price = Number(price.replace(",",""))
result.oldPrice = isNaN(Number(price))?0:Number(price)
console.log(result)