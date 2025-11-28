
const { GoogleAdsApi } = require('google-ads-api');

const client = new GoogleAdsApi({
    client_id: 'test',
    client_secret: 'test',
    developer_token: 'test',
});

console.log('Client methods:', Object.keys(client));
console.log('Client prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));

try {
    if (client.listAccessibleCustomers) {
        console.log('listAccessibleCustomers exists');
    } else {
        console.log('listAccessibleCustomers DOES NOT exist');
    }
} catch (e) {
    console.error(e);
}
