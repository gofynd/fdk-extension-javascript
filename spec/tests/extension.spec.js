'use strict';
const { extension } = require('../../lib/extension');

describe("Extension initialization flow and validations", () => {
    it('Should throw error on invalid/missing api key', async () => {
        try {
            await extension.initialize({
                api_secret: "API_SECRET",
            });
        }
        catch (err) {
            expect(err.message).toBe('Invalid api_key')
        }
    });

    it('Should throw error on invalid/missing api secret', async () => {
        try {
            await extension.initialize({
                api_key: "API_KEY",
            });
        }
        catch (err) {
            expect(err.message).toBe('Invalid api_secret')
        }
    });

    it('Should throw error on invalid/missing callback obj', async () => {
        try {
            await extension.initialize({
                api_key: "API_KEY",
                api_secret: "API_SECRET",
            });
        }
        catch (err) {
            expect(err.message).toBe('Missing some of callbacks. Please add all `auth` and `uninstall` callbacks.')
        }
    });

    it('Should throw error on invalid/missing auth callback', async () => {
        try {
            await extension.initialize({
                api_key: "API_KEY",
                api_secret: "API_SECRET",
                callbacks: {
                    uninstall: () => { }
                },
            });
        }
        catch (err) {
            expect(err.message).toBe('Missing some of callbacks. Please add all `auth` and `uninstall` callbacks.')
        }
    });

    it('Should throw error on invalid/missing uninstall callback', async () => {
        try {
            await extension.initialize({
                api_key: "API_KEY",
                api_secret: "API_SECRET",
                callbacks: {
                    auth: () => { },
                },
            });
        }
        catch (err) {
            expect(err.message).toBe('Missing some of callbacks. Please add all `auth` and `uninstall` callbacks.')
        }
    });

    it('Should throw error on invalid cluster', async () => {
        try {
            await extension.initialize({
                api_key: "API_KEY",
                api_secret: "API_SECRET",
                callbacks: {
                    uninstall: () => { },
                    auth: () => { },
                },
                cluster: "test",
            });
        }
        catch (err) {
            expect(err.message).toBe('Invalid cluster value. Invalid value: test')
        }
    });

    it('Should throw error on missing base url', async () => {
        try {
            await extension.initialize({
                api_key: "API_KEY",
                api_secret: "API_SECRET",
                callbacks: {
                    uninstall: () => { },
                    auth: () => { },
                },
                cluster: "http://localdev.fyndx0.de",
            });
        }
        catch (err) {
            expect(err.message).toBe('Invalid base_url value. Invalid value: test')
        }
    });

    it('Should throw error on invalid base url', async () => {
        try {
            await extension.initialize({
                api_key: "API_KEY",
                api_secret: "API_SECRET",
                callbacks: {
                    uninstall: () => { },
                    auth: () => { },
                },
                cluster: "http://localdev.fyndx0.de",
                base_url: "test",
            });
        }
        catch (err) {
            expect(err.message).toContain('Invalid base_url value. Invalid value: test')
        }
    });

    it('Should throw error on invalid scope', async () => {
        try {
            await extension.initialize({
                api_key: "API_KEY",
                api_secret: "API_SECRET",
                callbacks: {
                    uninstall: () => { },
                    auth: () => { },
                },
                cluster: "http://localdev.fyndx0.de",
                base_url: "http://localdev.fyndx0.de",
                scopes: [],
            });
        }
        catch (err) {
            expect(err.message).toContain('Invalid scopes in extension config. Invalid scopes: ')
        }
    });

    it('Should Intitialize extension successfully', async () => {
        await extension.initialize({
            api_key: "API_KEY",
            api_secret: "API_SECRET",
            callbacks: {
                uninstall: () => { },
                auth: () => { },
            },
            cluster: "http://localdev.fyndx0.de",
            base_url: "http://localdev.fyndx0.de",
            scopes: ["company/products"],
        });
        expect(extension.isInitialized).toBe(true);
    });
});