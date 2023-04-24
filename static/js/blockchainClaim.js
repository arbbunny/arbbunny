class ClaimIDOContainer extends React.Component {
    async componentDidMount() {
    }

    constructor(props) {
        super(props);
        self = this;

        // Network
        let isTesting = false;
        let networkToUse = 0;
        if (!isTesting) {
            networkToUse = 56; // Binance
        } else {
            networkToUse = 97; // Binance TestNet
        }

        self.state = {
            contractAddressUpgrade: '0x55Dd42c278A67DC91D9705066F7156AdC682cBc8',
            contractAddressBOTV1: '0x1Ab7E7DEdA201E5Ea820F6C02C65Fce7ec6bEd32',
            contractUpgrade: null,
            contractBOTV1: null,
            contractAddress: null,
            contract: null,
            accounts: null,
            account: "",
            loading: false,
            errorMessage: "",
            claimTimestamp: null,
            hasWeb3Account: false,
            hasWeb3AccountSEED: false,
            hasWeb3AccountIDO: false,
            hasWeb3AccountUPGRADE: false,
            networkToUse: networkToUse,
            isGoodConnectedNetwork: false
        }
    }

    async loadWeb3() {
        console.debug("loadWeb3");
        if (window.ethereum) {
            console.debug("window.ethereum");
            window.web3 = new Web3(window.ethereum);
            try {
                console.debug("try eth_requestAccounts");
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
                    .catch((error) => {
                        if (error.code === 4001) {
                            // EIP-1193 userRejectedRequest error
                            console.log('Please connect to Web3 Wallet.');
                        } else {
                            console.error(error);
                        }
                    });
                console.debug("accounts: " + accounts);
                if (accounts && accounts.length > 0) {
                    self.setState({ accounts: accounts, account: accounts[0], hasWeb3Account: true });

                    window.ethereum.on('accountsChanged', function (accounts) {
                        // Time to reload your interface with accounts[0]!
                        console.debug("Account changed. accounts: ", accounts)
                        if (accounts && accounts.length > 0) {
                            self.setState({ accounts: accounts, account: accounts[0], hasWeb3Account: true });
                        } else {
                            self.setState({ accounts: null, account: null, hasWeb3Account: false });
                        }
                    });
                }
            } catch (err) {
                self.showError(err, "loadWeb3");
            }
        }
        else if (window.web3) {
            console.debug("window.web3");
            window.web3 = new Web3(window.web3.currentProvider);
        } else {
            self.showWarning('Not detected any wallet. You will try any wallet with web3 support like Metamask!');
        }
        return window.web3;
    }

    async loadBlockchainDataUpgrade() {
        let isLoadedData = false;
        try {
            const web3 = window.web3;
            let jsonFileUpgrade = "/wp-content/themes/botplanet/abis/UpgradeToken.json";
            let jsonFileBOTV1 = "/wp-content/themes/botplanet/abis/BotTokenV1.json";

            $.getJSON(jsonFileBOTV1, function(json) {
                if(json) {
                    console.debug("Contract address BOTV1: ", self.state.contractAddressBOTV1);
                    const contract = new web3.eth.Contract(json.abi, self.state.contractAddressBOTV1);
                    self.setState({ contractBOTV1: contract });
                    isLoadedData = true;
                } else {
                    self.showError('Smart Contract BOT1 not detected in blockchain. Possible it is not deployed!', "loadBlockchainDataUpgrade");
                    self.setState({ contractBOTV1: null });
                    isLoadedData = false;
                }
            });

            $.getJSON(jsonFileUpgrade, function(json) {
                if(json) {
                    console.debug("Contract address UpgradeToken: ", self.state.contractAddressUpgrade);
                    const contract = new web3.eth.Contract(json.abi, self.state.contractAddressUpgrade);
                    self.setState({ contractUpgrade: contract });
                    self.setState({ hasWeb3AccountIDO: false, hasWeb3AccountSEED: false, hasWeb3AccountUPGRADE: true });
                    isLoadedData = true;
                } else {
                    self.showError('Smart Contract UpgradeToken not detected in blockchain. Possible it is not deployed!', "loadBlockchainDataUpgrade");
                    self.setState({ contractUpgrade: null });
                    isLoadedData = false;
                }
            });
        } catch (err) {
            self.showError(err, "loadBlockchainDataUpgrade");
            isLoadedData = false;
        }
        return isLoadedData;
    }

    async loadBlockchainDataClaim(contractType_) {
        let isLoadedData = false;
        try {
            const web3 = window.web3;
            const network = await web3.eth.net.getId();
            const networkId = network.toString();
            let jsonFile;
            let contractAddress;
            if (contractType_ === "IDO") {
                jsonFile = "/wp-content/themes/botplanet/abis/BOTClaimIDO.json";
                contractAddress = '0x329Fe917245c04E88654c3E7dA7C8905fA3E3EF9';
                self.setState({ hasWeb3AccountIDO: true, hasWeb3AccountSEED: false, hasWeb3AccountUPGRADE: false });
            } else if (contractType_ === "SEED") {
                jsonFile = "/wp-content/themes/botplanet/abis/BOTClaimSEED.json";
                contractAddress = '0x2B962954f094Fde9527D6054827DCe9fB7e956A9';
                self.setState({ hasWeb3AccountIDO: false, hasWeb3AccountSEED: true, hasWeb3AccountUPGRADE: false });
            } else {
                console.error("ERROR: contractType", contractType_);
            }
            $.getJSON(jsonFile, function (json) {
                if (json) {
                    const abi = json.abi;
                    //const contractAddress = networkData.address
                    console.debug("Contract address: ", contractAddress);
                    const contract = new web3.eth.Contract(abi, contractAddress);
                    const claimTimestampNow = self.getCurrentTime();
                    self.setState({
                        contract: contract,
                        claimTimestamp: claimTimestampNow,
                        contractAddress: contractAddress
                    });
                    isLoadedData = true;
                } else {
                    self.showError('Smart Contract not detected in blockchain. Possible it is not deployed!', "loadBlockchainDataClaim");
                    self.setState({
                        contract: null,
                        claimTimestamp: null,
                        contractAddress: null
                    });
                    isLoadedData = false;
                }
            });
        } catch (err) {
            self.showError(err, "loadBlockchainDataClaim");
            isLoadedData = false;
        }
        return isLoadedData;
    }

    getCurrentTime() {
        return Math.floor(Date.now() / 1000);
    }

    getDateTimeString(unixTimestamp) {
        const milliseconds = unixTimestamp * 1000; // 1575909015000;
        const d = new Date(milliseconds);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        let year = d.getFullYear();

        let hour = '' + d.getHours();
        let minutes = '' + d.getMinutes();
        let seconds = '' + d.getSeconds();

        if (hour.length < 2) {
            hour = '0' + hour;
        }
        if (minutes.length < 2) {
            minutes = '0' + minutes;
        }
        if (seconds.length < 2) {
            seconds = '0' + seconds;
        }
        if (month.length < 2) {
            month = '0' + month;
        }
        if (day.length < 2) {
            day = '0' + day;
        }

        return day + "/" + month + "/" + year + " " + hour + ":" + minutes + ":" + seconds;
    }

    bigNumToInt(bigNum_) {
        var result = 0;
        try {
            result = bigNum_;
        } catch (err) {
            try {
                result = bigNum_.toNumber();
            } catch (err) {
                result = bigNum_.toTwos() / Math.pow(10, 18);
            }
        }
        return result;
    }

    disconnectWallet = async (message_) => {
        try {
            web3 = null;
            window.web3 = null;
            self.setState({
                contractUpgrade: null,
                contractBOTV1: null,
                contractAddress: null,
                contract: null,
                accounts: null,
                account: "",
                loading: false,
                errorMessage: "",
                claimTimestamp: null,
                hasWeb3Account: false,
                hasWeb3AccountIDO: false,
                hasWeb3AccountSEED: false,
                hasWeb3AccountUPGRADE: false,
                isGoodConnectedNetwork: false
            })
        } catch (err) {
            self.showError(err, "disconnectWallet");
        }
    }

    async changeNetwork() {
        console.debug("changeNetwork");
        let isChanged = false;
        // Check if MetaMask is installed
        // MetaMask injects the global API into window.ethereum
        if (window.ethereum) {
            try {
                // check if the chain to connect to is installed
                let networkToUseHex = "0x" + self.state.networkToUse.toString(16);

                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: networkToUseHex }], // '0x61' chainId must be in hexadecimal numbers
                });

                isChanged = true;
            } catch (error) {
                // This error code indicates that the chain has not been added to MetaMask
                // if it is not, then install it into the user MetaMask
                if (error.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [
                                {
                                    chainId: networkToUseHex, // '0x61'
                                    rpcUrl: 'https://bsc-dataseed.binance.org/', // 'https://data-seed-prebsc-1-s1.binance.org:8545/',
                                },
                            ],
                        });
                        isChanged = true;
                    } catch (addError) {
                        console.error(addError);
                    }
                }
                console.error(error);
            }
        } else {
            // if no window.ethereum then MetaMask is not installed
            self.showError('Web3 wallet is not installed. Please consider installing it: https://metamask.io/download.html', "changeNetwork");
        }
        return isChanged;
    }

    connectWallet = async (message_, contractType_) => {
        // Please connect your Web3 to Polygon PoS Chain mumbai testnet network
        let isAlerted = false;
        console.debug(message_);
        try {
            let isGoodConnectedNetwork = false;
            let account = null;

            // Carga de Web3
            await this.loadWeb3();

            // Check connection
            let web3 = window.web3;

            if (typeof web3.eth !== 'undefined') {
                var network = await web3.eth.net.getId();
                const netID = network.toString();

                console.debug("Network: " + netID);
                let isTestnet;
                switch (netID) {
                    case "56":
                        network = "bsc-mainnet";
                        isTestnet = false;
                        if (self.state.networkToUse == 56) {
                            isGoodConnectedNetwork = true;
                        } else {
                            isGoodConnectedNetwork = false;
                        }
                        break;
                    case "97":
                        network = 'bsc-testnet';
                        isTestnet = true;
                        if (self.state.networkToUse == 97) {
                            isGoodConnectedNetwork = true;
                        } else {
                            isGoodConnectedNetwork = false;
                        }
                        break;
                    default:
                        network = 'unknown'
                        console.error('This is an unknown network.');
                        isTestnet = false;
                        isGoodConnectedNetwork = false;
                        console.debug("netID: " + netID + ", isTestnet: " + isTestnet);
                }

                // If is not correct network, try to change it
                if (!isGoodConnectedNetwork) {
                    let isChanged = await self.changeNetwork();
                    console.debug("Is network changed: ", isChanged);
                    isGoodConnectedNetwork = isChanged;
                }

                if (!isGoodConnectedNetwork) {
                    self.showWarning("Please connect your Wallet Web3 to Binance Smart Chain network.");
                    return { isOk: false, isAlerted: true };
                } else {
                    if (netID !== "56" && isTestnet === "false") {
                        self.showWarning("Please connect your Web3 to Binance Smart Chain Mainnet network");
                        return { isOk: false, isAlerted: true };
                    } else if (netID !== "97" && isTestnet === "true") {
                        self.showWarning("Please connect your Web3 to Binance Smart Chain Testnet network");
                        return { isOk: false, isAlerted: true };
                    } else {
                        // Carga de datos de Blockchain
                        if(contractType_ === "IDO" || contractType_ === "SEED") {
                            await this.loadBlockchainDataClaim(contractType_);
                        } else {
                            // UPGRADE
                            await this.loadBlockchainDataUpgrade();
                        }
                    }
                }
            } else {
                console.error("ERROR (connectWallet): web3.eth is not defined!");
                return { isOk: false, isAlerted: true };
            }
        } catch (err) {
            const code = err.code;
            const message = err.message;
            let detail = "";
            if (err.data) {
                detail = err.data.message;
            }
            let errMessage = "ERROR: code(" + code + "), message (" + message + "). Detail: " + detail;
            self.showError(errMessage, "connectWallet");
            return { isOk: false, isAlerted: true };
        } finally {
            self.setState({ loading: false });
        }
        return { isOk: true, isAlerted: isAlerted };
    }

    convertToDecimalAmount(tokensAmount) {
        let decimalAmount = tokensAmount / Math.pow(10, 18);
        return decimalAmount
    }

    userInfo = async (walletUser_, mensaje) => {
        try {
            console.log(mensaje);
            console.log("walletUser: " + walletUser_);
            const web3 = window.web3;
            const walletUserBytes = web3.utils.hexToBytes(walletUser_);
            console.log("walletUser (bytes): " + walletUserBytes);
            const item = await self.state.contract.methods.UserGetInfo(walletUser_).call();
            console.log("item: ", item);
            const [accountOut, totalPeriodsOut, lastClaimedPeriodOut, periodAmountOut, lastClaimTimestampOut, nextClaimTimestampOut, totalAmountToClaimOut, pendingAmountToClaimOut] = item;
            const account = accountOut;
            const totalPeriods = this.bigNumToInt(totalPeriodsOut);
            const lastClaimedPeriod = this.bigNumToInt(lastClaimedPeriodOut);
            const periodAmount = this.bigNumToInt(periodAmountOut);
            const lastClaimTimestamp = this.bigNumToInt(lastClaimTimestampOut);
            const nextClaimTimestamp = this.bigNumToInt(nextClaimTimestampOut);
            const totalAmountToClaim = this.bigNumToInt(totalAmountToClaimOut);
            const pendingAmountToClaim = this.bigNumToInt(pendingAmountToClaimOut);

            console.log("account(" + account + ")\n" +
                "totalPeriods(" + totalPeriods + ")\n" +
                "lastClaimedPeriod(" + lastClaimedPeriod + ")\n" +
                "periodAmount(" + periodAmount + ")\n" +
                "lastClaimTimestamp(" + lastClaimTimestamp + ")\n" +
                "nextClaimTimestamp(" + nextClaimTimestamp + ")\n" +
                "totalAmountToClaim(" + totalAmountToClaim + ")\n" +
                "pendingAmountToClaim(" + pendingAmountToClaim + ")");

            if (account === 0) {
                self.showWarning("Information about user is not registered.");
            } else {
                self.showInfo("Information about user:<br/>\n" +
                    "Wallet: " + account + "<br/>\n" +
                    "Total intervals: " + totalPeriods + "<br/>\n" +
                    "Last claim (interval): " + lastClaimedPeriod + "<br/>\n" +
                    "Tokens amount by interval: " + self.convertToDecimalAmount(periodAmount) + "<br/>\n" +
                    "Last claim: " + this.getDateTimeString(lastClaimTimestamp) + "<br/>\n" +
                    "Next claim: " + this.getDateTimeString(nextClaimTimestamp) + "<br/>\n" +
                    "Total amout to claim: " + self.convertToDecimalAmount(totalAmountToClaim) + "<br/>\n" +
                    "Rest amout to claim: " + self.convertToDecimalAmount(pendingAmountToClaim));
            }
        } catch (err) {
            self.processErrorException(err, "userInfo");
        } finally {
            self.setState({ loading: false });
        }
    }

    doClaim = async (mensaje_) => {
        let isAlertedError = false;
        let isClaimed = false;
        let isAlertedClaimed = false;
        try {
            console.log(mensaje_);
            const account = self.state.account;
            console.log("account: " + account);
            let promiseClaim = self.state.contract.methods.Claim().send({ from: account });
            promiseClaim.on("transactionHash", function (transactionHash) {
                console.log("Hash add:" + transactionHash)
            })
                .on("receipt", function (receipt) {
                    console.log("Receipt add:" + receipt);
                })
                .on("confirmation", function (confirmation) {
                    console.log("Confirmed add:" + confirmation);
                    isClaimed = true;
                    if (isClaimed && isAlertedError == false && isAlertedClaimed == false) {
                        self.showInfo("Claim transaction sent!");
                        isAlertedClaimed = true;
                    }
                })
                .on("error", async function (err) {
                    if (!isAlertedError) {
                        self.processErrorException(err, "doClaim");
                        isAlertedError = true;
                    }
                })
                .then(function (args) {
                    isClaimed = true;
                    if (isClaimed && isAlertedError == false && isAlertedClaimed == false) {
                        self.showInfo("Claim transaction sent.");
                        isAlertedClaimed = true;
                    }
                })
                .catch(error => {
                    if (!isAlertedError) {
                        self.processErrorException(error, "doClaim");
                        isAlertedError = true;
                    }
                });
        } catch (err) {
            if (!isAlertedError) {
                self.processErrorException(err, "doClaim");
                isAlertedError = true;
            }
        } finally {
            self.setState({ loading: false });
        }
    }

    isBlockchainError(err) {
        console.debug("isBlockchainError", err);

        let isBlockchainErr = false;
        let errorRpc = "";

        let errore = err.toString();
        let jsonRpcError = errore.includes("Internal JSON-RPC error");
        if (jsonRpcError) {
            if (typeof err.message === 'string') {
                let positionStartError = errore.indexOf("message\": \"");
                let errorParsed = errore.substring(positionStartError + 11);
                let positionEndError = errorParsed.indexOf("\"");
                errorParsed = errorParsed.substring(0, positionEndError);
                errorParsed = errorParsed.replace("execution reverted:", "");
                errorRpc = errorParsed;
                isBlockchainErr = true;
            }
        }

        return { errorInBlockchain: isBlockchainErr, error: errorRpc };
    }

    isRPCError(err) {
        console.debug("isRPCError", err);

        let isErrorRPC = false;
        let error = "";

        if (err.code) {
            if (err.message) {
                error = err.message;
                isErrorRPC = true;
            }
        }

        return { errorInRPC: isErrorRPC, errorRPC: error };
    }

    isEVMError(err) {
        console.debug("isEVMError", err);

        let isErrorEVM = false;
        let error = "";

        let errString = err.toString();
        if (errString.includes("Transaction has been reverted by the EVM")) {
            error = "Transaction has been reverted by the EVM. Transaction hash: ";

            let transactionHash = "";
            let positionStart = errString.indexOf("transactionHash\": \"");
            let errorParsed = errString.substring(positionStart + 19);
            let positionEnd = errorParsed.indexOf("\"");
            transactionHash = errorParsed.substring(0, positionEnd);
            error = error + transactionHash;

            isErrorEVM = true;
        }

        return { errorInEVM: isErrorEVM, errorEVM: error };
    }

    processErrorException(err, method) {
        let isShowed = false;

        // Blockchain error
        let { errorInBlockchain, error } = self.isBlockchainError(err);
        if (errorInBlockchain) {
            self.showError(error, "", "BLOCKCHAIN ERROR");
            isShowed = true;
        }

        // RPC Error
        if (isShowed == false) {
            let { errorInRPC, errorRPC } = self.isRPCError(err);
            if (errorInRPC) {
                self.showError(errorRPC, "", "ERROR RPC");
                isShowed = true;
            }
        }

        // EVM Error
        if (isShowed == false) {
            let { errorInEVM, errorEVM } = self.isEVMError(err);
            if (errorInEVM) {
                self.showError(errorEVM, "", "ERROR EVM");
                isShowed = true;
            }
        }

        // Other error type
        if (isShowed == false) {
            let errString = err.toString();
            let errMessage = "";
            if (errString.startsWith("ERROR")) {
                errMessage = errString;
            } else {
                errMessage = "ERROR: " + err.toString();
            }
            self.showError(errMessage, method, "ERROR");
        }
    }

    whenNextClaim = async (mensaje) => {
        try {
            console.debug(mensaje);
            const account = self.state.account;
            console.log("account: " + account);
            const response = await self.state.contract.methods.GetTimeForNextClaim()
                .call({ from: account });
            console.debug("response: ", response);
            const nextClaimTimestamp = this.bigNumToInt(response);
            console.debug("nextClaimTimestamp(" + nextClaimTimestamp + ")");
            if (nextClaimTimestamp === 0) {
                self.showError("Information about next claim is not allowed.");
            } else {
                self.showInfo("Next claim is allowed:<br />\n" +
                    "Allowed claim: after " + nextClaimTimestamp + " seconds\n");
            }
        } catch (err) {
            self.processErrorException(err, "whenNextClaim");
        } finally {
            self.setState({ loading: false });
        }
    }

    showInfo(message) {
        self.showMessage(message, "INFORMATION");
    }

    showWarning(message) {
        self.showMessage(message, "WARNING");
    }

    showError(err_, method_, title_ = "ERROR") {
        let msg = "";
        if (method_.length > 0) {
            msg = "ERROR (" + method_ + "): " + err_;
        } else {
            msg = err_;
        }
        self.showMessage(msg, title_);
        console.error(msg);
        self.setState({ errorMessage: msg });
    }

    showMessage(message, title) {
        // Show new info div
        var elemPopup = document.getElementById('popupInfo');
        if (elemPopup) {
            // Set info
            // Title
            var popupTitleText = document.getElementById('popupTitleText');
            popupTitleText.innerHTML = title;
            // Title shadow
            var popupTitleShadow = document.getElementById('popupTitleShadow');
            popupTitleShadow.innerHTML = title;
            // Description
            var popupDescription = document.getElementById('popupDescription');
            popupDescription.innerHTML = message;
            // Image
            var popupImg = document.getElementById('popupImg');
            popupImg.alt = title;

            // Show div
            elemPopup.style = "position: absolute; left: -0.0185px; top: -0.0185px; display: block;";
        } else {
            // Show normal window
            window.alert(message);
        }
    }

    async handleConnectClick(event, contractType) {
        event.preventDefault();
        const message = 'Connect wallet by web3 (' + contractType + ')';
        const { isOk, isAlerted } = await self.connectWallet(message, contractType);
        console.log("isOk: " + isOk + ", isAlerted: " + isAlerted);
        if (isOk) {
            console.log("Connected: " + self.state.account);
        } else if (!isAlerted) {
            self.showWarning("Please connect your Wallet Web3 to Binance Smart Chain network!");
        }
    }

    handleDisconectClick(event) {
        if (!self.state.hasWeb3Account) return;
        event.preventDefault();
        const message = 'Disconnect wallet by web3';
        self.disconnectWallet(message);
    }

    handleGetUserInfoClick(event, walletUser) {
        if (!self.state.hasWeb3Account) return;
        event.preventDefault();
        const mensaje = 'Get information of user wallet';
        self.setState({ account: walletUser });
        if (walletUser) {
            self.userInfo(walletUser, mensaje);
        } else {
            self.showError("User wallet is undefined!", "handleGetUserInfoClick");
        }
    }

    handleGetNextClaimClick(event, walletUser) {
        if (!self.state.hasWeb3Account) return;
        event.preventDefault();
        const mensaje = 'Get information of next claim';
        self.setState({ account: walletUser });
        if (walletUser) {
            self.whenNextClaim(mensaje);
        } else {
            self.showError("User wallet is undefined!", "handleGetNextClaimClick");
        }
    }

    handleMakeClaimClick(event) {
        if (!self.state.hasWeb3Account) return;
        event.preventDefault();
        const mensaje = 'Make claim';
        const walletUser = self.state.account;
        if (walletUser) {
            self.doClaim(mensaje);
        } else {
            self.showError("User wallet is undefined!", "handleMakeClaimClick");
        }
    }

    handleUpgradeTokensClick(event) {
        if (!self.state.hasWeb3Account) return;
        event.preventDefault();
        const message = "Upgrade token BOT's to V2";
        const walletUser = self.state.account;
        if (walletUser) {
            self.approve(message);
        } else {
            self.showError("User wallet is undefined!", "handleMakeClaimClick");
        }
    }

    approve = async (mensaje_) => {
        let isAlertedError = false;
        let isApproved = false;
        let isAlertedApproved = false;
        try {
            console.log(mensaje_);
            const account = self.state.account;
            console.log("account: " + account);
            const spender = self.state.contractAddressUpgrade;
            const amount = await self.state.contractBOTV1.methods.balanceOf(account).call();
            //const amount = '1000000000000000000000000000';
            console.info("approve(spender, amount)", spender, amount);
            let promiseApprove = self.state.contractBOTV1.methods.approve(spender, amount).send({ from: account });
            promiseApprove.on("transactionHash", function (transactionHash) {
                console.log("Hash add:" + transactionHash)
            })
                .on("receipt", function (receipt) {
                    console.log("Receipt add:" + receipt);
                })
                .on("confirmation", function (confirmation) {
                    console.log("Confirmed add:" + confirmation);
                    isApproved = true;
                    if (isApproved && isAlertedError == false && isAlertedApproved == false) {
                        isAlertedApproved = true;
                        self.upgradeTokens(mensaje_);
                    }
                })
                .on("error", async function (err) {
                    if (!isAlertedError) {
                        self.processErrorException(err, "approve");
                        isAlertedError = true;
                    }
                })
                .then(args => {
                    isApproved = true;
                    if (isApproved && isAlertedError == false && isAlertedApproved == false) {
                        isAlertedApproved = true;
                        self.upgradeTokens(mensaje_);
                    }
                })
                .catch(error => {
                    if (!isAlertedError) {
                        self.processErrorException(error, "approve");
                        isAlertedError = true;
                    }
                });
        } catch (err) {
            if (!isAlertedError) {
                self.processErrorException(err, "approve");
                isAlertedError = true;
            }
        } finally {
            self.setState({ loading: false });
        }
    }

    upgradeTokens = async (mensaje_) => {
        let isAlertedError = false;
        let isUpdated = false;
        let isAlertedUpdated = false;
        try {
            console.log(mensaje_);
            const account = self.state.account;
            console.log("account: " + account);
            let promiseUpgrade = self.state.contractUpgrade.methods.upgrade().send({ from: account });
            promiseUpgrade.on("transactionHash", function (transactionHash) {
                console.log("Hash add:" + transactionHash)
            })
                .on("receipt", function (receipt) {
                    console.log("Receipt add:" + receipt);
                })
                .on("confirmation", function (confirmation) {
                    console.log("Confirmed add:" + confirmation);
                    isUpdated = true;
                    if (isUpdated && isAlertedError == false && isAlertedUpdated == false) {
                        self.showInfo("Update transaction sent!");
                        isAlertedUpdated = true;
                    }
                })
                .on("error", async function (err) {
                    if (!isAlertedError) {
                        self.processErrorException(err, "upgradeTokens");
                        isAlertedError = true;
                    }
                })
                .then(args => {
                    isUpdated = true;
                    if (isUpdated && isAlertedError == false && isAlertedUpdated == false) {
                        self.showInfo("Update transaction sent.");
                        isAlertedUpdated = true;
                    }
                })
                .catch(error => {
                    if (!isAlertedError) {
                        self.processErrorException(error, "upgradeTokens");
                        isAlertedError = true;
                    }
                });
        } catch (err) {
            if (!isAlertedError) {
                self.processErrorException(err, "upgradeTokens");
                isAlertedError = true;
            }
        } finally {
            self.setState({ loading: false });
        }
    }

    render() {
        return (
            <div>
                <div className="popup popup-modal1-claim-seed" id="claimSeed">
                    <div className="popup-wrapper popup-wrapper-top-margin">
                        <div className="popup-block">
                            <div className="popup__close">
                            </div>
                            <div className="popup__body">
                                <div className="popup__line">
                                    <div className="popup__head"><span>general information</span><span>general information</span></div>
                                    <a href="#"
                                        className={self.state.hasWeb3AccountSEED ? "sitebutton popup__button popup-button-top-margin" : "sitebutton popup__button popup-button-top-margin disabled"}
                                        onClick={(event) => this.handleGetNextClaimClick(event, self.walletUserSeed.value)}>
                                        When is the next claim
                                    </a>
                                </div>
                                <div className="popup__line">
                                    <div className="popup__head popup__head--full-width"><span>User information</span><span>User information</span></div>
                                    <input type="text" name="wallet" className="popup__input-wallet" placeholder="User wallet address"
                                        defaultValue={self.state.account}
                                        ref={(input) => self.walletUserSeed = input} />
                                    <a href="#"
                                        className={self.state.hasWeb3AccountSEED ? "sitebutton popup__button" : "sitebutton popup__button disabled"}
                                        onClick={(event) => this.handleGetUserInfoClick(event, self.walletUserSeed.value)}>
                                        Get claim info
                                    </a>
                                </div>
                                <div className="popup__line">
                                    <div className="popup__head"><span>Make a claim</span><span>Make a claim</span></div>
                                    <a href="#"
                                        className={self.state.hasWeb3AccountSEED ? "sitebutton popup__button popup-button-top-margin" : "sitebutton popup__button popup-button-top-margin disabled"}
                                        onClick={(event) => this.handleMakeClaimClick(event)}>
                                        CLAIM
                                    </a>
                                </div>
                                <div className="popup__line popup-bottom">
                                    <a href="#"
                                        className={!self.state.hasWeb3AccountSEED ? "sitebutton popup-bottom__button" : "sitebutton popup-bottom__button disabled"}
                                        onClick={(event) => this.handleConnectClick(event, 'SEED')}>
                                        <img src="/wp-content/themes/botplanet/assets/images/bg-icon-connect.svg" alt="Connect your wallet" />
                                        Connect your wallet (SEED)
                                    </a>
                                    <a href="#"
                                        className={self.state.hasWeb3AccountSEED ? "sitebutton popup-bottom__button" : "sitebutton popup-bottom__button disabled"}
                                        onClick={(event) => this.handleDisconectClick(event)}>
                                        <img src="/wp-content/themes/botplanet/assets/images/bg-icon-disconnect.svg" alt="Disconnect wallet" />
                                        Disconnect wallet
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="overlay">
                        </div>
                    </div>
                </div>

                <div className="popup popup-modal1-claim-ido" id="claimIDO">
                    <div className="popup-wrapper popup-wrapper-top-margin">
                        <div className="popup-block">
                            <div className="popup__close">
                            </div>
                            <div className="popup__body">
                                <div className="popup__line">
                                    <div className="popup__head"><span>general information</span><span>general information</span></div>
                                    <a href="#"
                                        className={self.state.hasWeb3AccountIDO ? "sitebutton popup__button popup-button-top-margin" : "sitebutton popup__button popup-button-top-margin disabled"}
                                        onClick={(event) => this.handleGetNextClaimClick(event, self.walletUserIDO.value)}>
                                        When is the next claim
                                    </a>
                                </div>
                                <div className="popup__line">
                                    <div className="popup__head popup__head--full-width"><span>User information</span><span>User information</span></div>
                                    <input type="text" name="wallet" className="popup__input-wallet" placeholder="User wallet address"
                                        defaultValue={self.state.account}
                                        ref={(input) => self.walletUserIDO = input} />
                                    <a href="#"
                                        className={self.state.hasWeb3AccountIDO ? "sitebutton popup__button" : "sitebutton popup__button disabled"}
                                        onClick={(event) => this.handleGetUserInfoClick(event, self.walletUserIDO.value)}>
                                        Get claim info
                                    </a>
                                </div>
                                <div className="popup__line">
                                    <div className="popup__head"><span>Make a claim</span><span>Make a claim</span></div>
                                    <a href="#"
                                        className={self.state.hasWeb3AccountIDO ? "sitebutton popup__button popup-button-top-margin" : "sitebutton popup__button popup-button-top-margin disabled"}
                                        onClick={(event) => this.handleMakeClaimClick(event)}>
                                        CLAIM
                                    </a>
                                </div>
                                <div className="popup__line popup-bottom">
                                    <a href="#"
                                        className={!self.state.hasWeb3AccountIDO ? "sitebutton popup-bottom__button" : "sitebutton popup-bottom__button disabled"}
                                        onClick={(event) => this.handleConnectClick(event, 'IDO')}>
                                        <img src="/wp-content/themes/botplanet/assets/images/bg-icon-connect.svg" alt="Connect your wallet" />
                                        Connect your wallet (IDO)
                                    </a>
                                    <a href="#"
                                        className={self.state.hasWeb3AccountIDO ? "sitebutton popup-bottom__button" : "sitebutton popup-bottom__button disabled"}
                                        onClick={(event) => this.handleDisconectClick(event)}>
                                        <img src="/wp-content/themes/botplanet/assets/images/bg-icon-disconnect.svg" alt="Disconnect wallet" />
                                        Disconnect wallet
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="overlay">
                        </div>
                    </div>
                </div>

                <div className="popup popup-modal1-upgrade-token" id="upgradeToken">
                    <div className="popup-wrapper popup-wrapper-top-margin">
                        <div className="popup-block">
                            <div className="popup__close">
                            </div>
                            <div className="popup__body">
                                <div className="popup__line" id="headerUpgradeToken">
                                    <div className="popup__head"><span>Upgrade your tokens bot to v2</span><span>Upgrade your tokens bot to v2</span></div>
                                </div>
                                <div className="popup__line2" id="textUpgradeToken">
                                    <b>Hello traveler!</b><br />

                                    If you got here, then you are looking for a new BOT token contract...follow me!<br />

                                    The transition to the V2 version of the contract is due to the fact that in connection with the development of the product, our project faced some restrictions, namely:<br />
                                    1. Fixed maximum number of tokens per address.<br />
                                    2. Lack of possibility to implement DAO.<br />
                                    3. Limited possibility of collaboration with exchanges.<br />

                                    Together we have created a V2 version of the contract, and looking down below, you will see the details. Enjoy!<br />

                                    <b>ATTENTION:</b> When switching to the V2 version, the emission will be 10 times less and therefore the number of your tokens will be reduced by 10 times, like that of all other users. At the same time, the price of the token will increase proportionally!<br /><br />

                                    In connection with the replacement of the contract, we have introduced many different useful elements! <br />
                                    <a href="/wp-content/themes/botplanet/assets/files/new-token-v2.pdf" target="_blank" id="linkToDocUpgradeToken">Read more in the document</a>
                                </div>
                                <div className="popup__line popup-bottom" id="footerUpgradeToken">
                                    <a href="#"
                                        className={!self.state.hasWeb3AccountUPGRADE ? "sitebutton popup-bottom__button" : "sitebutton popup-bottom__button disabled"}
                                        onClick={(event) => this.handleConnectClick(event, 'UPGRADE')}>
                                        <img src="/wp-content/themes/botplanet/assets/images/bg-icon-connect.svg" alt="Connect your wallet" />
                                        Connect your wallet
                                    </a>
                                    <a href="#"
                                        className={self.state.hasWeb3AccountUPGRADE ? "sitebutton popup-bottom__button" : "sitebutton popup-bottom__button disabled"}
                                        onClick={(event) => this.handleUpgradeTokensClick(event)}>
                                        <img src="/wp-content/themes/botplanet/assets/images/bg-icon-select.svg" alt="Upgrade your BOT's to V2" />
                                        Upgrade your BOT's to V2
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="overlay">
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

ReactDOM.render(
    <ClaimIDOContainer />,
    document.getElementById('claimSEEDAndIDO')
);