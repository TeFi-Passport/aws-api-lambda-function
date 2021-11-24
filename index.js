const AWS = require("aws-sdk");

const dynamo = new AWS.DynamoDB.DocumentClient();

const tableName = 'terra-passport-hackathon';

exports.handler = async (event, context) => {
    let body;
    let statusCode = 200;
    const headers = {
        "Content-Type": "application/json"
    };

    try {
        switch (event.routeKey) {
            case "DELETE /passports/{address}":
                await dynamo
                    .delete({
                        TableName: tableName,
                        Key: {
                            address: event.pathParameters.address
                        }
                    })
                    .promise();
                body = `Deleted item ${event.pathParameters.address}`;
                break;
            case "GET /passports/{address}":
                console.log(await passportExists(event.pathParameters.address));
                body = await getPassport(event.pathParameters.address);
                break;
            case "GET /passports":
                body = await dynamo.scan({TableName: tableName}).promise();
                break;
            case "PUT /passports":
                let requestJSON = JSON.parse(event.body);

                checkRequestJSON(requestJSON);

                const passport = await getPassport(requestJSON.address)
                const exists = passportExists(passport);

                // If the passport already exists, we just update it
                if (exists) {
                    body = await updatePassport(requestJSON, passport);
                } else {
                    body = await addPassport(requestJSON);
                }

                break;
            default:
                throw new Error(`Unsupported route: "${event.routeKey}"`);
        }
    } catch (err) {
        statusCode = 400;
        body = err.message;
    } finally {
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers
    };
};

/**
 * Return the passport associated with the given address
 * @param {string} address - the address of the owner of the passport
 * @returns {Promise<any>} - the passport
 */
const getPassport = async (address) => {
    return (await dynamo
        .get({
            TableName: tableName,
            Key: {
                address: address
            }
        })
        .promise()).Item;
}

/**
 * Returns the true if the address owns a passport - false otherwise
 * @param {{}} passport - the passport of the address (you can get it with getPassport(address))
 * @returns {boolean} - true is the address owns a passport - false otherwise
 */
const passportExists = (passport) => {
    return !!passport;
}

/**
 * Add a passport to the DB
 * @param {JSON} requestJSON - the JSON passes in param of the PUT request
 * @returns {Promise<{}>} - the generated passport
 */
const addPassport = async (requestJSON) => {

    const now = Date.now();

    let params = {
        address : requestJSON.address,
        score: requestJSON.score,
        deliveryDate: now,
        lastUpdated: now
    }

    if (requestJSON.transactionID)
        params.transactionID = requestJSON.transactionID;

    await dynamo
        .put({
            TableName: tableName,
            Item: {
                ...params
            }
        })
        .promise();

    return params;
}

/**
 * Update a passport in the DB
 * @param {JSON} requestJSON - the JSON passes in param of the PUT request
 * @param {{}} passport - the existing passport
 * @returns {Promise<{}>} - the updated passport
 */
const updatePassport = async (requestJSON, passport) => {
    if (!requestJSON.transactionID)
        throw new Error('Updating a passport requires providing the transaction ID of the associated transaction');

    const now = Date.now();

    let params = {
        ...passport,
        address : requestJSON.address,
        score: requestJSON.score,
        lastUpdated: now,
        transactionID: requestJSON.transactionID
    }

    await dynamo
        .put({
            TableName: tableName,
            Item: {
                ...params
            }
        })
        .promise();

    return await getPassport(requestJSON.address);
}

/**
 * check if the JSON passed in param of the PUT request has all the valid fields
 * @param {JSON} requestJSON - the JSON passed in param of the PUT request
 */
const checkRequestJSON = (requestJSON) => {
    if (!requestJSON.address)
        throw new Error('You need to provide a valid address');

    if (!requestJSON.score)
        throw new Error('You need to provide a valid score');

    if (requestJSON.score < 0 || requestJSON.score > 1000)
        throw new Error('The score needs to be between 0 and 1000');
}