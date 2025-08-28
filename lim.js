const axios = require('axios');
const { ethers } = require('ethers');
const readline = require('readline');
const fs = require('fs').promises;
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');

const colors = {
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    red: '\x1b[91m',
    cyan: '\x1b[96m',
    white: '\x1b[97m',
    magenta: '\x1b[95m',
    blue: '\x1b[94m',
    gray: '\x1b[90m',
    bold: '\x1b[1m',
    reset: '\x1b[0m'
};

const logger = {
    info: (msg) => console.log(`${colors.cyan}[i] ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}[!] ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}[x] ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}[+] ${msg}${colors.reset}`),
    loading: (msg) => console.log(`${colors.magenta}[*] ${msg}${colors.reset}`),
    step: (msg) => console.log(`${colors.blue}[>] ${colors.bold}${msg}${colors.reset}`),
    critical: (msg) => console.log(`${colors.red}${colors.bold}[FATAL] ${msg}${colors.reset}`),
    summary: (msg) => console.log(`${colors.green}${colors.bold}[SUMMARY] ${msg}${colors.reset}`),
    banner: () => {
        const border = `${colors.blue}${colors.bold}╔═════════════════════════════════════════╗${colors.reset}`;
        const title = `${colors.blue}${colors.bold}║   🍉 19Seniman From Insider    🍉   ║${colors.reset}`;
        const bottomBorder = `${colors.blue}${colors.bold}╚═════════════════════════════════════════╝${colors.reset}`;
        
        console.log(`\n${border}`);
        console.log(`${title}`);
        console.log(`${bottomBorder}\n`);
    },
    section: (msg) => {
        const line = '─'.repeat(40);
        console.log(`\n${colors.gray}${line}${colors.reset}`);
        if (msg) console.log(`${colors.white}${colors.bold} ${msg} ${colors.reset}`);
        console.log(`${colors.gray}${line}${colors.reset}\n`);
    },
    countdown: (msg) => process.stdout.write(`\r${colors.blue}[⏰] ${msg}${colors.reset}`),
};


const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

const chatPrompts = [
    "Hello! How are you today?",
    "What's the weather like?",
    "Tell me a fun fact",
    "What can you help me with?",
    "Explain blockchain in simple terms",
    "What's new in AI?",
    "Tell me about cryptocurrency",
    "How does machine learning work?",
    "What are some interesting topics to discuss?",
    "Give me some advice for today",
    "What's the latest in technology?",
    "Tell me something inspiring",
    "How can I be more productive?",
    "What are the benefits of AI?",
    "Explain decentralized finance"
];

class PerspectiveAIBot {
    constructor() {
        this.walletsFile = 'wallets.json';
        // Nama file diubah di sini
        this.codeFile = 'refferal.txt';
        this.proxyFile = 'proxies.txt';
        this.refCode = null;
        this.proxies = [];
    }

    isValidUUID(str) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }

    decodeBase64(str) {
        try {
            return Buffer.from(str, 'base64').toString('utf8');
        } catch (error) {
            logger.error(`Failed to decode Base64: ${error.message}`);
            return str;
        }
    }

    async loadProxies() {
        try {
            const proxyData = await fs.readFile(this.proxyFile, 'utf8');
            const proxyLines = proxyData.split('\n').map(line => line.trim()).filter(line => line);
            
            this.proxies = proxyLines.map(line => {
                let proxyUrl = line;

                if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
                    proxyUrl = proxyUrl.replace(/^https?:\/\//, '');
                }

                if (!proxyUrl.includes('@') && !proxyUrl.startsWith('http')) {
                    proxyUrl = `http://${proxyUrl}`;
                }

                if (proxyUrl.includes('@') && !proxyUrl.startsWith('http')) {
                    proxyUrl = `http://${proxyUrl}`;
                }
                
                return proxyUrl;
            });
            
            logger.info(`Loaded ${this.proxies.length} proxies from ${this.proxyFile}`);
            return this.proxies;
        } catch (error) {
            logger.warn(`Failed to load proxies from ${this.proxyFile}: ${error.message}`);
            return [];
        }
    }

    getRandomProxy() {
        if (this.proxies.length === 0) {
            logger.warn('No proxies available, proceeding without proxy');
            return null;
        }
        const proxy = this.proxies[Math.floor(Math.random() * this.proxies.length)];
        logger.info(`Using proxy: ${proxy}`);
        return new HttpsProxyAgent(proxy);
    }

    getRandomUserAgent() {
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    getRandomPrompt() {
        return chatPrompts[Math.floor(Math.random() * chatPrompts.length)];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async makeRequestWithRetry(requestFn, maxRetries = 3, delayMs = 2000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                if (error.response?.status === 403 || error.response?.status === 429) {
                    logger.warn(`Request failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs/1000}s...`);
                    await this.sleep(delayMs * attempt); 
                } else {
                    throw error;
                }
            }
        }
    }

    generateSecChUa(userAgent) {
        if (userAgent.includes('Chrome/120')) {
            return '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
        } else if (userAgent.includes('Chrome/119')) {
            return '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"';
        } else if (userAgent.includes('Firefox')) {
            return '"Not_A Brand";v="8", "Firefox";v="121"';
        }
        return '"Not;A=Brand";v="99", "Google Chrome";v="120", "Chromium";v="120"';
    }

    async readReferralCode() {
        try {
            this.refCode = await fs.readFile(this.codeFile, 'utf8');
            this.refCode = this.refCode.trim();

            if (!this.isValidUUID(this.refCode)) {
                const decodedCode = this.decodeBase64(this.refCode);
                
                if (this.isValidUUID(decodedCode)) {
                    this.refCode = decodedCode;
                    logger.info(`Referral code decoded from Base64: ${this.refCode}`);
                } else {
                    logger.warn('Referral code is not a UUID and could not be decoded as Base64');
                }
            } else {
                logger.info(`Referral code loaded (UUID): ${this.refCode}`);
            }
        } catch (error) {
            // Pesan error juga diubah di sini
            logger.error(`Failed to read referral code from refferal.txt`);
            throw error;
        }
    }

    async loadWallets() {
        try {
            const data = await fs.readFile(this.walletsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    async saveWallets(wallets) {
        await fs.writeFile(this.walletsFile, JSON.stringify(wallets, null, 2));
    }

    createWallet() {
        const wallet = ethers.Wallet.createRandom();
        return {
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: wallet.mnemonic?.phrase || null
        };
    }

    async signMessage(privateKey, message) {
        const wallet = new ethers.Wallet(privateKey);
        return await wallet.signMessage(message);
    }

    async initSIWE(address, userAgent, proxyAgent) {
        const secChUa = this.generateSecChUa(userAgent);
        
        return await this.makeRequestWithRetry(async () => {
            const response = await axios.post('https://auth.privy.io/api/v1/siwe/init', {
                address: address
            }, {
                headers: {
                    'accept': 'application/json',
                    'accept-language': 'en-US,en;q=0.9',
                    'content-type': 'application/json',
                    'priority': 'u=1, i',
                    'privy-app-id': 'cmc373uuc01e9jp0m4px3rjcc',
                    'privy-ca-id': 'f5f2f377-be89-4841-b3ce-7f4331ec6ed4',
                    'privy-client': 'react-auth:2.16.0',
                    'sec-ch-ua': secChUa,
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'cross-site',
                    'sec-gpc': '1',
                    'user-agent': userAgent,
                    'origin': 'https://app.perspectiveai.xyz',
                    'referer': 'https://app.perspectiveai.xyz/'
                },
                httpsAgent: proxyAgent
            });
            return response.data;
        });
    }

    async authenticateSIWE(message, signature, address, userAgent, proxyAgent) {
        const secChUa = this.generateSecChUa(userAgent);
        
        return await this.makeRequestWithRetry(async () => {
            const response = await axios.post('https://auth.privy.io/api/v1/siwe/authenticate', {
                message: message,
                signature: signature,
                chainId: 'eip155:1',
                walletClientType: 'okx_wallet',
                connectorType: 'injected',
                mode: 'login-or-sign-up'
            }, {
                headers: {
                    'accept': 'application/json',
                    'accept-language': 'en-US,en;q=0.9',
                    'content-type': 'application/json',
                    'priority': 'u=1, i',
                    'privy-app-id': 'cmc373uuc01e9jp0m4px3rjcc',
                    'privy-ca-id': 'f5f2f377-be89-4841-b3ce-7f4331ec6ed4',
                    'privy-client': 'react-auth:2.16.0',
                    'sec-ch-ua': secChUa,
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'cross-site',
                    'sec-gpc': '1',
                    'user-agent': userAgent,
                    'origin': 'https://app.perspectiveai.xyz',
                    'referer': 'https://app.perspectiveai.xyz/'
                },
                httpsAgent: proxyAgent
            });
            return response.data;
        });
    }

    async loginToPerspectiveAI(token, userAgent, proxyAgent) {
        const secChUa = this.generateSecChUa(userAgent);
        
        return await this.makeRequestWithRetry(async () => {
            const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
            const formData = [
                `--${boundary}`,
                'Content-Disposition: form-data; name="token"',
                '',
                token,
                `--${boundary}`,
                'Content-Disposition: form-data; name="referred_by_user_id"',
                '',
                this.refCode,
                `--${boundary}`,
                'Content-Disposition: form-data; name="marketing_opt_in"',
                '',
                '1',
                `--${boundary}--`
            ].join('\r\n');

            const response = await axios.post('https://core-api.perspectiveai.xyz/api/auth/login', formData, {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en-US,en;q=0.9',
                    'content-type': `multipart/form-data; boundary=${boundary}`,
                    'priority': 'u=1, i',
                    'sec-ch-ua': secChUa,
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-site',
                    'sec-gpc': '1',
                    'user-agent': userAgent,
                    'origin': 'https://app.perspectiveai.xyz',
                    'referer': 'https://app.perspectiveai.xyz/'
                },
                httpsAgent: proxyAgent
            });
            return response.data;
        });
    }

    async getUserInfo(authToken, userAgent, proxyAgent) {
        const secChUa = this.generateSecChUa(userAgent);
        
        return await this.makeRequestWithRetry(async () => {
            const response = await axios.get('https://core-api.perspectiveai.xyz/api/users/me', {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en-US,en;q=0.9',
                    'access-control-allow-origin': '*',
                    'authorization': `Bearer ${authToken}`,
                    'priority': 'u=1, i',
                    'sec-ch-ua': secChUa,
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-site',
                    'sec-gpc': '1',
                    'user-agent': userAgent,
                    'referer': 'https://app.perspectiveai.xyz/'
                },
                httpsAgent: proxyAgent
            });
            return response.data;
        });
    }

    async getChatList(authToken, userAgent, proxyAgent) {
        try {
            const secChUa = this.generateSecChUa(userAgent);
            
            const response = await axios.get('https://core-api.perspectiveai.xyz/api/chats?page=1', {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en-US,en;q=0.9',
                    'access-control-allow-origin': '*',
                    'authorization': `Bearer ${authToken}`,
                    'priority': 'u=1, i',
                    'sec-ch-ua': secChUa,
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-site',
                    'sec-gpc': '1',
                    'user-agent': userAgent,
                    'referer': 'https://app.perspectiveai.xyz/'
                },
                httpsAgent: proxyAgent
            });

            return response.data;
        } catch (error) {
            logger.warn(`Get chat list failed: ${error.message}`);
            return null;
        }
    }

    async createChatSession(authToken, userAgent, proxyAgent) {
        try {
            const secChUa = this.generateSecChUa(userAgent);
            
            const response = await axios.post('https://core-api.perspectiveai.xyz/api/chats', {
                title: 'New Chat',
                model_id: '9f0907d2-0161-4efc-804e-0e508d017812'
            }, {
                headers: {
                    'accept': 'application/json',
                    'accept-language': 'en-US,en;q=0.9',
                    'authorization': `Bearer ${authToken}`,
                    'content-type': 'application/json',
                    'priority': 'u=1, i',
                    'sec-ch-ua': secChUa,
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-site',
                    'sec-gpc': '1',
                    'user-agent': userAgent,
                    'referer': 'https://app.perspectiveai.xyz/'
                },
                httpsAgent: proxyAgent
            });

            return response.data;
        } catch (error) {
            logger.warn(`Create chat session failed: ${error.message}`);
            return null;
        }
    }

    async sendMarkfiRequest(userAgent, proxyAgent) {
        try {
            const response = await axios.post('https://a.markfi.xyz/', {
                data: "IlhcIEc0ZS0+Y2htWG11YkRaSUhkeGBaMThHdSI7MS1Ba1lAaVBWLzwnN3B6X2xEJF9rOEspYCZMWWcxTnAyLlo2XS5oWUx7czMgXU5YTEJOczBRcCRZVTgqXDhzSTlEPyxIZzpVZH1zKXIoWFQ7bEwsNFFjY1V8LEwqPGlLcS1FP3wrI2g3aDQ9NiYlbTQubkZkdEN+fVdZVD1rQ212fEYxaXl1Zzd+OCtceC1qVV1yRms2J1RiNXAqdX1oPEt6P1dccy0kc2U+Wj5IOzZ+YktBLmYoZmc1cDA0bkI9d3pRaykuOkQ0XFhcMVFJaG9uY2lKYzVcQFlNUj8qOV0yWy89Qz8kOTpRQC5KZGk4JTg2XCxiVk4vWVguQWhGcm5FZl5tQEU/eUtBR3Zaaip1Y2pwYEhiT0B2Wj0kW1lYXldFU2p8XnFYNy1cai07ZyNgLHFjalRSYntwMEpyd2cpKzxAdSA0NiAiLiFSZ3F8b2ooe1lcZ1NNV2M/fF5JXC5XdkggIn0tSSNSPXB+T1AoNDdFfWNyVXtUKTlUND95bD02K0N0QEBRSzxwPip0RFlEfDpRUihkeFEuLD9ZQXR4Qjd8WyY+RVZCZHx4IXFUPlVuOHxIfCVnLWFsdGg0NCIific6OWhYJDRUM2RqM0FeUGYlS21PUChicio/K3wwSERdUXZQKUxJQkU3a1xfQ11EIWZfd21yaVJMMmleOERhaWB2UkRAO2BPMT0tQCUve1VQKSwzfEFQNmBPQSpJXVQ5KGl3WDU9MztkcU02MCI+ajlcSGNnRzVEMEBsbVl0OERNNGpNM1VfJHojUHleZUsoVm5UJFo1aGFlbjhtNThFe3g6MCEjNS9Hb2hXdTArOilYUnkrLCNKcyVMXlRkRk1TYVcxaFFbOXt9Y20gMmRTdW05VG49UFB6a2xtK3NBKC1zKFUqJUAgdVwzZ1glYnROUndXXTV0Xl4jbTYsJTNZZi9Mdk5FLUQtPVReQV88c1A+NWZHUm9NInFSTllmfkRdaXEmKm5wTzM1SmRHYFZOOUhsUm1NfGNfLz8iVGE3emBeQ28xay5VS25YQkVEbiQnM3Y8JjloNCJqVWtcRVpFODU9T3JrdE8tdn5UdCkoKzo7cTcreDFJK001WGYsLjQ0Tl44NGcmdDhVM30meGl3XDJIZlA4PFl6KFk3UUcXHCY+KBY5V05mKSA8ATEEeAsac0MVCgVPdFp0dFFoYgIIH1NDVz1fJxNyUgx9HAEeKjwGAH8VEAJ4Qy5LGhAoWUkRQWUraX10fUMdZUBFangMG2haXihYcQcBKVUKZgdIF08WETpmGUBuXFU2BjYnEA52CFQdPwFefxBTSlMYGRhRT0VWQA5ARxgjBR1tBgQtdmteAyIZKRUiDFAfF1ABSl1IcUwdUm1wRnNcAgo2VVRHBxEfDV97Tl01aEdJRVUIUT5bJAZ5DgclAGdcDVRSB0B3ZDpvCFEZOQpdcVQlWTllD0QjORoGHQZMeFYHbA08YXcNHwttZTNOSWYNEQsNImUcf1ZZdkBAQmMNQHpsXzg/SxUBMh4LZ1x8PSU3TAkuIjMfLA8KNCpIXEItGjslGClUSzUqemQMZxEYHSgUeGBMMAZIT0UPQnwZAgQgPQ9ZXBIFOS9HfkpQLBBUFhoCc31ANAJTUE07exo/OUV/bwcLXhIqJjEMe1QKUkMLSGl0M1EcGztyBBZnLRwNBjoWdgUbG39nWTtcWkcmAGJscxpvEVhPVmh7FS9bNzcKOVRzQk1RPjQVHycVRnlDUGgDEUZQWlQCMUwUCV0SPF4fRWAOFh0EWFUNF1AXGhE/MUpQO0QXSn0VfmFWC3tWbwdBDEQeBAsEBnxtfRAGIEUpHicnfAIocHZucw9VaVdFOSEGAX5FflQtCgxAMTcnK1RJb3JVXy9ISlRkYxACA1JxfgZAHCBMKC89Fh1aQHYGCxEXRgMoUFVQTA9LCToPRX1bMVwsQE8rEUsrIUEeJFw7fR5YEWVPbh16HGJedgh4QBwCIQ9MCBcCZ0lICAUMEw0CdVo8Z0AKHg4TaWBXExsTEFEJbio9CSM3PA8yfg43KFwPX1lAFABUf1cbXCYdVD8+WFFOHnQFcQYcQgZnHgdsAgAvVhUcRBYVbGgMdTlQAjc9RjlPXEARY0RLKQUlMUI0D0B4fCA8XxwlUEFEfSlNLEYVICsqFRs3f1MqewZMEydSXCQtI0JsbBtkTiIfIgoKO0pNAG5DFQdMfCYZVAVaESoaOWB/P0xFREcfU0gbUhZRDzsPAyg/NktUWipQR1YhTBsbdk4LW05UXy5aTgtCKEwoF3RET09AUSkxSk1FHFZLMF0ZeRUMBC9TLwNyRUE=",
                keySize: 886
            }, {
                headers: {
                    'accept': '*/*',
                    'accept-language': 'en-US,en;q=0.9',
                    'content-type': 'application/json',
                    'priority': 'u=1, i',
                    'sec-ch-ua': this.generateSecChUa(userAgent),
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'cross-site',
                    'sec-gpc': '1',
                    'user-agent': userAgent,
                    'referer': 'https://app.perspectiveai.xyz/'
                },
                httpsAgent: proxyAgent
            });

            return response.data;
        } catch (error) {
            
            return null;
        }
    }

    async sendChatMessage(authToken, prompt, userAgent, chatId, proxyAgent) {
        try {
            const secChUa = this.generateSecChUa(userAgent);
            
            const response = await axios.post(`https://core-api.perspectiveai.xyz/api/chats/${chatId}/messages`, {
                prompt: prompt,
                model_id: '9f0907d2-0161-4efc-804e-0e508d017812'
            }, {
                headers: {
                    'accept': 'application/json',
                    'accept-language': 'en-US,en;q=0.9',
                    'authorization': `Bearer ${authToken}`,
                    'content-type': 'application/json',
                    'priority': 'u=1, i',
                    'sec-ch-ua': secChUa,
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-site',
                    'sec-gpc': '1',
                    'user-agent': userAgent,
                    'referer': 'https://app.perspectiveai.xyz/'
                },
                httpsAgent: proxyAgent
            });

            return response.data;
        } catch (error) {
            logger.warn(`Chat message failed: ${error.message}`);
            return null;
        }
    }

    async registerWallet(wallet, index, total) {
        const userAgent = this.getRandomUserAgent();
        const proxyAgent = this.getRandomProxy();
        
        logger.step(`[${index + 1}/${total}] Registering wallet: ${wallet.address}`);

        try {
            await this.sleep(2000 + Math.random() * 3000);

            logger.loading('Initializing SIWE...');
            const siweInit = await this.initSIWE(wallet.address, userAgent, proxyAgent);
            
            await this.sleep(1500 + Math.random() * 1500);

            const message = `app.perspectiveai.xyz wants you to sign in with your Ethereum account:\n${wallet.address}\n\nBy signing, you are proving you own this wallet and logging in. This does not initiate a transaction or cost any fees.\n\nURI: https://app.perspectiveai.xyz\nVersion: 1\nChain ID: 1\nNonce: ${siweInit.nonce}\nIssued At: ${new Date().toISOString()}\nResources:\n- https://privy.io`;

            logger.loading('Signing message...');
            const signature = await this.signMessage(wallet.privateKey, message);

            await this.sleep(1000 + Math.random() * 1000);

            logger.loading('Authenticating...');
            const authResult = await this.authenticateSIWE(message, signature, wallet.address, userAgent, proxyAgent);

            await this.sleep(1500 + Math.random() * 1500);

            logger.loading('Logging in to PerspectiveAI...');
            const loginResult = await this.loginToPerspectiveAI(authResult.token, userAgent, proxyAgent);

            await this.sleep(1000 + Math.random() * 1000);

            const userInfo = await this.getUserInfo(loginResult.token, userAgent, proxyAgent);

            wallet.token = loginResult.token;
            wallet.userId = userInfo.data.id;
            wallet.registered = true;
            wallet.userAgent = userAgent;
            wallet.proxy = proxyAgent ? proxyAgent.proxy : null;

            logger.success(`Wallet registered successfully! User ID: ${userInfo.data.id}`);

            await this.sendMarkfiRequest(userAgent, proxyAgent);

            logger.loading('Setting up chat session...');
            let chatId = null;

            const chatList = await this.getChatList(loginResult.token, userAgent, proxyAgent);
            
            if (chatList && chatList.data && chatList.data.length > 0) {

                chatId = chatList.data[0].id;
                logger.info('Using existing chat session');
            } else {

                const newChat = await this.createChatSession(loginResult.token, userAgent, proxyAgent);
                if (newChat && newChat.data) {
                    chatId = newChat.data.id;
                    logger.info('Created new chat session');
                } else {
                    chatId = crypto.randomUUID();
                    logger.info('Using generated chat ID as fallback');
                }
            }

            await this.sleep(1000 + Math.random() * 1000);

            logger.loading('Sending chat messages...');
            for (let i = 0; i < 3; i++) {
                const prompt = this.getRandomPrompt();
                logger.info(`Sending message ${i + 1}/3: "${prompt}"`);
                
                const result = await this.sendChatMessage(loginResult.token, prompt, userAgent, chatId, proxyAgent);
                
                if (result) {
                    logger.success(`Message ${i + 1}/3 sent successfully!`);
                } else {
                    logger.warn(`Message ${i + 1}/3 failed to send`);
                }
                
                if (i < 2) {
                    await this.sleep(3000 + Math.random() * 4000); 
                }
            }

            logger.success('Chat session completed!');
            
            return wallet;

        } catch (error) {
            logger.error(`Failed to register wallet ${wallet.address}: ${error.message}`);
            if (error.response?.status) {
                logger.error(`HTTP Status: ${error.response.status}`);
            }
            if (error.response?.data) {
                logger.error(`Response: ${JSON.stringify(error.response.data)}`);
            }
            wallet.registered = false;
            wallet.error = error.message;
            wallet.proxy = proxyAgent ? proxyAgent.proxy : null;
            return wallet;
        }
    }

    async run() {
        logger.banner();

        try {
            await this.loadProxies();

            await this.readReferralCode();

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const walletCount = await new Promise((resolve) => {
                rl.question(`${colors.cyan}How many wallets do you want to create and register? ${colors.reset}`, (answer) => {
                    resolve(parseInt(answer));
                });
            });

            rl.close();

            if (isNaN(walletCount) || walletCount <= 0) {
                logger.error('Invalid number of wallets');
                return;
            }

            logger.info(`Creating ${walletCount} wallets...`);

            let wallets = await this.loadWallets();

            const newWallets = [];
            for (let i = 0; i < walletCount; i++) {
                const wallet = this.createWallet();
                newWallets.push(wallet);
                logger.info(`Created wallet ${i + 1}/${walletCount}: ${wallet.address}`);
            }

            logger.success(`${walletCount} wallets created!`);
            logger.step('Starting registration process...');

            for (let i = 0; i < newWallets.length; i++) {
                const wallet = await this.registerWallet(newWallets[i], i, newWallets.length);
                wallets.push(wallet);

                await this.saveWallets(wallets);

                if (i < newWallets.length - 1) {
                    const delay = 15000 + Math.random() * 20000; 
                    logger.loading(`Waiting ${Math.round(delay/1000)}s before next registration...`);
                    await this.sleep(delay);
                }
            }

            const successful = wallets.filter(w => w.registered).length;
            const failed = wallets.filter(w => w.registered === false).length;

            logger.success(`Registration completed!`);
            logger.info(`[+] Successful: ${successful}`);
            logger.info(`[x] Failed: ${failed}`);
            logger.info(`Wallets saved to: ${this.walletsFile}`);

        } catch (error) {
            logger.error(`Bot error: ${error.message}`);
        }
    }
}

const bot = new PerspectiveAIBot();
bot.run().catch(console.error);
