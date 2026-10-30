import axios from 'axios'
const convertCurrency = async (to, from,amount) =>{

console.log(`converting ${amount}${from} to ${to}`)

const data = axios.get(`https://api.frankfurter.dev/v2/rate/${from}/${to}`,
    {timeout:10000}
)

return amount * data.rate


}
export default convertCurrency