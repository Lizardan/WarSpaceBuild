
async function initialize_server(server_url) {
    identifier = 'warspacetest';
    transport = new AnchorLinkBrowserTransport();
    link = new AnchorLink({
        transport,
        chains: [
            {
                chainId: '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4',
                nodeUrl: server_url,
            }
        ],
    });
    wax = new waxjs.WaxJS({
        rpcEndpoint: server_url
    });
}

if (mode_test == "client") {
    client = true;
} else if (mode_test == "web") {
    client = false;
}
const autoLogin = false;

async function anchorLogin() {
    anchorLogin = true;
    await link.login(identifier).then((result) => {
        session = result.session
    });
    userAccount = session.auth.actor;
    console.log("Anchor login: " + userAccount);
    const result = await wax.rpc.get_table_rows({
        json: true,               // Get the response as json
        code: 'warspacetest',      // Contract that we target
        scope: 'warspacetest',         // Account that owns the data
        table: 'accounts',        // Table name
        lower_bound: userAccount,
        limit: 1,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
    });
    console.log("Result Rows: " + result.rows[0].username);
    if (result.rows[0].username != userAccount) {
        try {
            const action = {
                account: 'warspacetest',
                name: 'login',
                authorization: [session.auth],
                data: {
                    username: wax.userAccount,
                }
            }
            session.transact({ action }).then((result) => {
                GameInstance.SendMessage('JSManager', 'LoginResponse', userAccount.toString());
                console.log('Transaction broadcast! ${ result.processed.id }\n');
            });
        } catch (e) {
            GameInstance.SendMessage('JSManager', 'ErrorResponse', " " + e.message);
            console.log(e.message);
        }
    } else {
        GameInstance.SendMessage('JSManager', 'LoginResponse', userAccount.toString());
        console.log('User exist: ' + userAccount);
    }
}
async function login() {
    try {
        const userAccount = await wax.login();
        const result = await wax.rpc.get_table_rows({
            json: true,               // Get the response as json
            code: 'warspacetest',      // Contract that we target
            scope: 'warspacetest',         // Account that owns the data
            table: 'accounts',        // Table name
            lower_bound: userAccount,
            limit: 1,                // Maximum number of rows that we want to get
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
        });
        if (result.rows[0].username != userAccount) {
            try {
                await wax.api.transact({
                    actions: [{
                        account: 'warspacetest',
                        name: 'login',
                        data: {
                            username: wax.userAccount,
                            memo: "login"
                        },
                        authorization: [{
                            actor: wax.userAccount,
                            permission: 'active',
                        }],
                    }]
                }, {
                    blocksBehind: 3,
                    expireSeconds: 15
                });
                await add_token_account();

            } catch (e) {
                GameInstance.SendMessage('JSManager', 'ErrorResponse', " " + e.message);
                console.log(e.message);
            }
        }
        return userAccount;
    } catch (e) {
        GameInstance.SendMessage('JSManager', 'ErrorResponse', " " + e.message);
        console.log("Error (login): " + e);
        return false;
    }
}

if (autoLogin == true) {
    const userAuth = login();
}


async function anchorButton() {
    await anchorLogin();
}


async function loginButton() {

    if (autoLogin == false) {
        userAuth = await login();
        if (client) {
            GameInstance.SendMessage('JSManager', 'LoginResponse', userAuth.toString());
        } else {
            return userAuth;
        }
    } else {
        console.log("Auto Login = True");
        return false;
    }
}
async function getUser(username = "", client = true) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (username == "") {
        if (!anchorLogin) {
            if (!wax.api) {
                console.log("* Login first *   (getUser)");
                return false;
            }
        }
        var updater = userAuth;
    } else {
        var updater = username;
    }
    try {
        const result = await wax.rpc.get_table_rows({
            json: true,               // Get the response as json
            code: 'warspacetest',      // Contract that we target
            scope: 'warspacetest',         // Account that owns the data
            table: 'accounts',        // Table name
            limit: 10,                // Maximum number of rows that we want to get
            lower_bound: updater,
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
        });
        var res = "json";
        result.rows.forEach((element) => {
            if (element.username == updater) {
                res = element;
            }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (client) {
            GameInstance.SendMessage('JSManager', 'GetUserResponse', JSON.stringify(res));
        } else {
            return res;
        }
    } catch (e) {
        GameInstance.SendMessage('JSManager', 'ErrorResponse', " " + e.message);
        console.log("Error (getUser): " + e);
        return false;
    }
}

async function setNft(slot_nft, nftid) {
    if (!wax.api) {
        console.log("* Login first *   (setNft)");
        return false;
    }
    var nfts;
    const updater = wax.userAccount;
    var res = await getUser(updater, false).then(data => {
        nfts = data.items;
        nfts[parseInt(slot_nft)] = nftid;
        try {
            const result = wax.api.transact({
                actions: [{
                    account: 'warspacetest',
                    name: 'setnft',
                    data: {
                        username: updater,
                        item_code: nfts,
                    },
                    authorization: [{
                        actor: updater,
                        permission: 'active',
                    }],
                }]
            }, {
                blocksBehind: 3,
                expireSeconds: 30
            });
            new Promise(resolve => setTimeout(resolve, 500));
            return result;
        } catch (e) {
            GameInstance.SendMessage('JSManager', 'ErrorResponse', " " + e.message);
            console.log("Error (setNft): " + e);
        }
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    GameInstance.SendMessage('JSManager', 'SetNftResponse', JSON.stringify(res));
}
async function delNft(slot_nft) {
    if (!wax.api) {
        console.log("* Login first *   (setNft)");
        return false;
    }
    var nfts;
    const updater = wax.userAccount;

    var res = await getUser(updater, false).then(data => {
        nfts = data.items;
        nfts[parseInt(slot_nft)] = 0;
        try {
            const result = wax.api.transact({
                actions: [{
                    account: 'warspacetest',
                    name: 'setnft',
                    data: {
                        username: updater,
                        item_code: nfts,
                    },
                    authorization: [{
                        actor: updater,
                        permission: 'active',
                    }],
                }]
            }, {
                blocksBehind: 3,
                expireSeconds: 30
            });
            new Promise(resolve => setTimeout(resolve, 500));
            return result;
        } catch (e) {
            GameInstance.SendMessage('JSManager', 'ErrorResponse', " " + e.message);
            console.log("Error (setNft): " + e);
        }
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    GameInstance.SendMessage('JSManager', 'DelNftResponse', JSON.stringify(res));
}
async function getMineInfo(nft_id) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (!wax.api) {
        console.log("* Login first *   (getMineInfo)");
        return false;
    }
    const updater = wax.userAccount;
    try {
        const result = await wax.rpc.get_table_rows({
            json: true,               // Get the response as json
            code: 'warspacetest',      // Contract that we target
            scope: 'warspacetest',         // Account that owns the data
            table: 'mineinfo',        // Table name
            lower_bound: nft_id,
            limit: 10,                // Maximum number of rows that we want to get
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
        });
        var res = "json";
        result.rows.forEach((element) => {
            if (element.mine_code == nft_id) {
                res = element;
            }
        });
        GameInstance.SendMessage('JSManager', 'GetMineInfoResponse', JSON.stringify(res));
    } catch (e) {
        GameInstance.SendMessage('JSManager', 'ErrorResponse', " " + e.message);
        console.log("Error (getMineInfo): " + e);
        return false;
    }
}
async function mining_predata(slot) {

    await getUser(wax.userAccount, false).then(data_user => {
        var datae = "";
        $.ajax({
            url: 'https://wax.api.atomicassets.io/atomicassets/v1/assets/' + data_user.items[slot] + '/',
            success: function (data) {
                datae = data;
                wax.rpc.get_table_rows({
                    json: true,               // Get the response as json
                    code: 'warspacetest',      // Contract that we target
                    scope: 'warspacetest',         // Account that owns the data
                    table: 'confres',        // Table name
                    limit: 500,                // Maximum number of rows that we want to get
                    reverse: false,           // Optional: Get reversed data
                    show_payer: false          // Optional: Show ram payer
                }).then(resulte => {
                    var res = "json";
                    for (var i = 0; i < resulte.rows.length; i++) {
                        if (resulte.rows[i].template_id == datae.data.template.template_id) {
                            GameInstance.SendMessage('JSManager', 'Mining_predataResponse', JSON.stringify(resulte.rows[i]));
                        }
                    }
                });
            }
        });
    });
}
async function craft_nft_info() {
    await wax.rpc.get_table_rows({
        json: true,               // Get the response as json
        code: 'warspacetest',      // Contract that we target
        scope: 'warspacetest',         // Account that owns the data
        table: 'confcraft',        // Table name
        limit: 20,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
    }).then(resulte => {
        GameInstance.SendMessage('JSManager', 'Craft_nft_infoResponse', JSON.stringify(resulte));
    });
}
async function craft_nft(nft_name) {
    try {
        const result = await wax.api.transact({
            actions: [{
                account: 'warspacetest',
                name: 'craftnft',
                data: {
                    username: wax.userAccount,
                    nft_name: nft_name,
                },
                authorization: [{
                    actor: wax.userAccount,
                    permission: 'active',
                }],
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 30
        });
        GameInstance.SendMessage('JSManager', 'Craft_nftResponse', JSON.stringify(result));
    } catch (e) {
        GameInstance.SendMessage('JSManager', 'ErrorResponse', " " + e.message);
        console.log("Error (Craft): " + e);
    }
}
async function mining(resource, slot, tokenhash) {
    if (!wax.api) {
        console.log("* Login first *   (mining)");
        return false;
    }
    const updater = wax.userAccount;
    try {
        const result = await wax.api.transact({
            actions: [{
                account: 'warspacetest',
                name: 'mine',
                data: {
                    username: updater,
                    resource: resource,
                    nonce_code: tokenhash,
                    id_item: slot,
                },
                authorization: [{
                    actor: updater,
                    permission: 'active',
                }],
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 30
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (client) {
            GameInstance.SendMessage('JSManager', 'MiningResponse', JSON.stringify(result));
        } else {
            return result;
        }
    } catch (e) {
        GameInstance.SendMessage('JSManager', 'ErrorResponse', " " + e.message);
        console.log("Error (Mining): " + e);
    }
}

async function claim(resource, slot) {
    if (!wax.api) {
        console.log("* Login first *   (mining)");
        return false;
    }
    const updater = wax.userAccount;
    var rand_int = Math.floor(Math.random() * (99999999 - 0) + 0);
    try {
        const result = await wax.api.transact({
            actions: [{
                account: 'warspacetest',
                name: 'claim',
                data: {
                    username: updater,
                    slot_id: slot,
                    resource: resource,
                },
                authorization: [{
                    actor: updater,
                    permission: 'active',
                }],
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 30
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (client) {
            GameInstance.SendMessage('JSManager', 'ClaimResponse', JSON.stringify(result));
        } else {
            return result;
        }
    } catch (e) {
        GameInstance.SendMessage('JSManager', 'ErrorResponse', " " + e.message);
        console.log("Error (Claim): " + e);
    }
}
async function add_token_account() {
    var result = await wax.api.transact({
        actions: [{
            account: 'wallet.wax',
            name: 'tokenset',
            data: {
                from: wax.userAccount,
                contract: "farmmineliri",
                token: "4,WSGT",
                displayname: "War Space Gold Test",
                image: "https://playwarspace.com/images/gold_512.png",
            },
            authorization: [{
                actor: wax.userAccount,
                permission: 'active',
            }],
        }]
    }, {
        blocksBehind: 3,
        expireSeconds: 15
    });
    var result = await wax.api.transact({
        actions: [{
            account: 'wallet.wax',
            name: 'tokenset',
            data: {
                from: wax.userAccount,
                contract: "farmmineliri",
                token: "4,WSFT",
                displayname: "War Space Food Test",
                image: "https://playwarspace.com/images/meat_512.png",
            },
            authorization: [{
                actor: wax.userAccount,
                permission: 'active',
            }],
        }]
    }, {
        blocksBehind: 3,
        expireSeconds: 15
    });
    var result = await wax.api.transact({
        actions: [{
            account: 'wallet.wax',
            name: 'tokenset',
            data: {
                from: wax.userAccount,
                contract: "farmmineliri",
                token: "4,WSST",
                displayname: "War Space Stone Test",
                image: "https://playwarspace.com/images/stone_512.png",
            },
            authorization: [{
                actor: wax.userAccount,
                permission: 'active',
            }],
        }]
    }, {
        blocksBehind: 3,
        expireSeconds: 15
    });
    var result = await wax.api.transact({
        actions: [{
            account: 'wallet.wax',
            name: 'tokenset',
            data: {
                from: wax.userAccount,
                contract: "farmmineliri",
                token: "4,WSWT",
                displayname: "War Space Wood Test",
                image: "https://playwarspace.com/images/wood_512.png",
            },
            authorization: [{
                actor: wax.userAccount,
                permission: 'active',
            }],
        }]
    }, {
        blocksBehind: 3,
        expireSeconds: 15
    });
}
async function getBalance(updater) {
    if (!anchorLogin) {
        if (!wax.api) {
            console.log("* Login first *   (getBalance)");
            return false;
        }
    }
    //const fail = document.getElementById('fail').checked;

    const result = await wax.rpc.get_table_rows({
        json: true,               // Get the response as json
        code: 'eosio.token',      // Contract that we target
        scope: updater,         // Account that owns the data
        table: 'accounts',        // Table name
        limit: 10,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
    });
    var res = "json";
    var balance_wax = "";
    result.rows.forEach((element) => {
        //$("#food").text(JSON.stringify(element.balance));
        balance_wax = element.balance.slice(0, -3);
    });
    if (balance_wax == "") {
        balance_wax = 0;
    }
    $.ajax({
        url: "https://api.coingecko.com/api/v3/simple/price?ids=wax&vs_currencies=usd",
        dataType: 'json',
        success: function (data) {
            blnc_result = parseFloat(balance_wax) * parseFloat(data.wax.usd);
            if (client) {
                GameInstance.SendMessage('JSManager', 'GetBalanceResponse', JSON.stringify({ "usd": blnc_result, "wax": parseFloat(balance_wax) }));
            } else {
                return { "usd": blnc_result.toFixed(4), "wax": parseFloat(balance_wax).toFixed(4) };
            }
        }
    });
}
async function transfer(id_resource, token) {
    if (!wax.api) {
        alert("* Login first *");
    }
    try {
        const result = await wax.api.transact({
            actions: [{
                account: 'warspacetest',
                name: 'withd',
                data: {
                    username: wax.userAccount,
                    resource: id_resource,
                    amount: token,
                },
                authorization: [{
                    actor: wax.userAccount,
                    permission: 'active',
                }],
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 15
        });
        GameInstance.SendMessage('JSManager', 'WithdrawResponse', JSON.stringify(result));
    } catch (e) {
        //document.getElementById('response').append(e.message);
        GameInstance.SendMessage('JSManager', 'ErrorResponse', " " + e.message);
    }
}
