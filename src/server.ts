// Modules
import cors from 'cors';
import * as http from 'http';
import express from 'express';
import sessions from 'express-session';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { ApolloServerPluginDrainHttpServer, } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';


// GraphQl import
import schema from './schema';
import { createContext } from './utils/context';

// Utils
import { initDb } from './utils/mongoDb';
import { consoleMessage, consoleMessageResult } from './utils/consoleMessage';

// Data
import { getUser } from './resolvers/userResolvers';

// Config
import 'dotenv/config';

interface MyContext {
    token?: String;
}

// Add a list of allowed origins.
// If you have more origins you would like to add, you can add them to the array below.
const allowedOrigins = [
    'http://localhost:3000',
    'https://studio.apollographql.com',
    'https://arthos-portfolio.vercel.app',
    'https://portfolio-client-5uac1fbso-xarthos.vercel.app',
    'https://portfolio-client-xarthos.vercel.app'
];

const oneDay = 1000 * 60 * 60 * 24;
const port = process.env.PORT || 4000;

// const startApolloServer = async (schema: any, createTestContext: any) => {
const startApolloServer = async (schema: any) => {
    const app: express.Application = (module.exports = express());
    const httpServer: http.Server = http.createServer(app);
    //? Pulgin for handling http error response (optional)
    // const setHttpPlugin = {
    //     async requestDidStart() {
    //         return {
    //             async willSendResponse({ response }: any) {
    //                 response.http.headers.set('custom-header', 'custom-error');
    //                 if (response.body.kind === 'single' &&
    //                     response.body.singleResult.errors?.[0]?.extensions?.code === 'TEAPOT') {
    //                     response.http.status = 418;
    //                 };

    //                 if (response.body.kind === 'single' &&
    //                     response.body.singleResult.errors?.[0]?.extensions?.code === 'USER_NOT_FOUND') {
    //                     console.log(response)
    //                     response.http.status = 200;
    //                 };
    //             }
    //         };
    //     },
    // };

    // Create an Apollo server
    const server: ApolloServer<MyContext> = new ApolloServer({
        schema,
        introspection: true, // Allows apollo.sandbox to read server's schemas
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer }),
            ApolloServerPluginLandingPageLocalDefault({ footer: false })
            // setHttpPlugin
        ],
        formatError: (formattedError, error) => {
            // GraphQL schema doesn't match
            if (
                formattedError.extensions?.code ===
                ApolloServerErrorCode.GRAPHQL_VALIDATION_FAILED
            ) {
                return {
                    ...formattedError,
                    message: 'Your query doesn\'t match the schema. Try double-checking it!',
                    statusCode: 404
                };
            };

            // User not registered/missing
            if (
                formattedError.extensions?.code === 'USER_NOT_FOUND' &&
                formattedError.extensions?.argumentName === 'Not in Database'
            ) {
                return {
                    ...formattedError,
                    message: 'User not found',
                    statusCode: 204
                };
            };

            // Otherwise return the formatted error. This error can also
            // be manipulated in other ways, as long as it's returned.
            return formattedError;
        }
    });

    // Start the server
    await server.start();

    const corsOptions: cors.CorsOptions = {
        origin: allowedOrigins,
        methods: 'GET, HEAD, OPTIONS, PUT, PATCH, POST, DELETE',
        allowedHeaders: [
            'Content-Type',
            'Origin',
            'Access-Control-Request-Method',
            'Access-Control-Request-Headers',
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Credentials',
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Methods',
            'Connection',
            'Authorization',
            'Content-Length',
            'Cookie',
            'DNT',
            'Host',
            'Refer',
            'User-Agent'
        ],
        preflightContinue: false,
        credentials: true,
        optionsSuccessStatus: 204,
        maxAge: 84600
    };

    // App Config
    app.use(
        '/graphql',
        cors<cors.CorsRequest>(corsOptions),
        bodyParser.urlencoded({ extended: false }),
        bodyParser.json(),
        cookieParser(),
        express.json(),
        expressMiddleware(server, {
            context: createContext,
        }),
        sessions({
            secret: process.env.SESSION_SECRET || 'sessionSecretTest',
            saveUninitialized: false,
            resave: false,
            cookie: {
                maxAge: oneDay,
                secure: false,
                sameSite: 'none'
            }
        })
    );

    // Routes
    app.get(`/`, async (req, res) => {
        const data = getUser(undefined, { _id: '623222d2826ad9c729d5fb1e' }, { user: undefined, session: { isAuth: false } });

        return res.status(200).send(await data);
    });

    // Connect to MongoDb
    await initDb();

    // Start the Http Server
    consoleMessage('Server', 'startApolloServer', `Attempt to run server`);
    await new Promise<void>(resolve => httpServer.listen({ port: port }, resolve));
    // await new Promise<void>(resolve => app.listen({ port: port }, resolve));

    // Console a successfully response
    consoleMessageResult(true, 'startApolloServer', `🚀 Server ready at`);
    console.log('\x1b[34m%s\x1b[0m', `http://localhost:${port}`);
    console.log('\x1b[90m%s\x1b[0m', '--------------------------');
};

// Start the server
startApolloServer(schema);