const { expect } = require('chai');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const endpoint = 'https://o6n5xqp6c2.execute-api.us-east-2.amazonaws.com';
const terraAddress = 'terratestaddress';

describe('API', () => {
    before(async () => {
        await api('/passports/'+terraAddress, 'DELETE', null)
    });

    it('should create a passport', async () => {
        const res = await api('/passports', 'PUT', {
            "address": terraAddress,
            "score": 700
        });
        expect(res.address).to.be.equal(terraAddress);
        expect(res.score).to.be.equal(700);
    });
});

const api = async (path, method, body) => {
    const requestOptions = {
        method: method,
        headers: {"Content-Type": "application/json"},
        redirect: 'follow'
    };

    if (body)
        requestOptions.body =  JSON.stringify(body);

    const res = await fetch(endpoint+path, requestOptions)
    return await res.json();
}