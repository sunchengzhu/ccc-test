import fetch from 'node-fetch';
import fs from 'fs-extra';
import JSZip from 'jszip';
import path from 'path';
import puppeteer, { Page } from 'puppeteer';

async function downloadCRX(url: string, outputPath: string): Promise<void> {
  if (await fs.pathExists(outputPath)) {
    console.log('CRX file already exists. Skipping download.');
  } else {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
    console.log('Download complete.');
  }
}

async function extractCRX(crxPath: string, extractPath: string): Promise<void> {
  const data = await fs.readFile(crxPath);
  const zip = new JSZip();
  const content = await zip.loadAsync(data);

  console.log('Extraction started...');
  await Promise.all(
    Object.keys(content.files).map(async filename => {
      const file = content.file(filename);
      if (file && !file.dir) {
        const fileData = await file.async("nodebuffer");
        const outputPath = path.join(extractPath, filename);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, fileData);
      }
    })
  );
  console.log('Extraction complete.');
}

async function startBrowser(extensionPath: string): Promise<any> {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ],
    defaultViewport: null
  });

  try {
    const extensionPageTarget = await browser.waitForTarget(target => target.type() === 'page' && target.url().includes('initialize'), {timeout: 30000});
    if (extensionPageTarget) {
      const page = await extensionPageTarget.page();
      await page.bringToFront();
      console.log('Navigating to the initialize page...');

      // 等待页面稳定
      await page.waitForFunction('document.readyState === "complete"');

      // 等待“导入已有钱包”按钮出现并点击
      await page.waitForSelector('button[data-testid="okd-button"].okui-btn.btn-xl.btn-outline-primary.block', {visible: true});
      await page.click('button[data-testid="okd-button"].okui-btn.btn-xl.btn-outline-primary.block');
      console.log('已点击 "导入已有钱包"');

      // 等待并点击“助记词或私钥”
      await page.waitForSelector('div._wallet-space-item_1px67_9', {visible: true});
      await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('div._wallet-space-item_1px67_9'));
        const mnemonicOption = options.find(option => (option as HTMLElement).innerText.includes('助记词或私钥'));
        if (mnemonicOption instanceof HTMLElement) {
          mnemonicOption.click();
        }
      });
      console.log('已点击 "助记词或私钥"');

      await typeInMnemonicAndSubmit(page);

      await typeInPasswordAndSubmit(page);

      const balanceSelector = '._balanceWrapper_1j1uf_1';
      await page.waitForSelector(balanceSelector, {visible: true});
      console.log('插件已加载，显示余额信息');

      // 导航到特定网页
      const mainPage = await browser.newPage();
      await mainPage.goto('https://www.okx.com/zh-hans/web3', {waitUntil: 'domcontentloaded'});
      console.log('已跳转web3钱包页面并加载DOM内容');

      await connectWallet(mainPage, page);

      const result = await mainPage.evaluate(() => {
        return okxwallet.bitcoinTestnet.connect();
      });
      console.log('Result of bitcoin.connect():', result);
      const signers = await page.evaluate(() => {
      });

      // 等待一段时间观察操作结果
      await new Promise(resolve => setTimeout(resolve, 10000));

    } else {
      console.log('Extension initialize page not found.');
    }
  } finally {
    // 确保浏览器无论如何都关闭
    await browser.close();
    console.log('Browser closed.');
  }
}

async function connectWallet(mainPage: Page, page: Page): Promise<void> {
  const firstButtonSelector = '.wallet-pc-connect-button.connect-wallet-button';
  await mainPage.waitForSelector(firstButtonSelector, {visible: true});
  await mainPage.click(firstButtonSelector);
  console.log('已点击第一个 "连接钱包" 按钮');

  // 点击第二个“连接钱包”按钮
  const secondButtonSelector = '.wallet_okd610.wallet_okd610-btn.btn-md.btn-fill-highlight';
  await mainPage.waitForSelector(secondButtonSelector, {visible: true});
  await mainPage.click(secondButtonSelector);
  console.log('已点击第二个 "连接钱包" 按钮');

  // 使用waitForFunction检查至少有两个okd-button按钮
  await page.waitForFunction(
    selector => document.querySelectorAll(selector).length === 2,
    {},
    'button[data-testid="okd-button"]'
  );

  // 选择页面上所有的 `okd-button` 按钮
  const buttons = await page.$$('button[data-testid="okd-button"]');
  if (buttons.length > 1) {
    await buttons[1].click(); // 点击第二个按钮
    console.log('已点击第二个 "okd-button" 按钮');
  } else {
    console.log('没有足够的 "okd-button" 按钮可供点击');
  }
}

async function typeInMnemonicAndSubmit(page: Page): Promise<void> {
  const inputSelector = 'input.mnemonic-words-inputs__container__input';
  await page.waitForSelector(inputSelector, {visible: true});
  const inputs = await page.$$(inputSelector);

  if (inputs.length === 0) {
    console.error('No input fields found for mnemonic words.');
    return;
  }

  const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  const mnemonicWords = mnemonic.split(' ');

  for (let i = 0; i < inputs.length; i++) {
    if (i < mnemonicWords.length) {
      await inputs[i].type(mnemonicWords[i], {delay: 0});
    }
  }

  console.log('已输入助记词');

  await clickButton(page, "助记词确认");
}

async function typeInPasswordAndSubmit(page: Page): Promise<void> {
  const passwordSelectors = 'input.okui-input-input._passwordInput_1n2q0_5[type="password"]';

  // 等待密码输入框可见
  await page.waitForSelector(passwordSelectors, {visible: true});

  // 获取所有密码输入框
  const passwordInputs = await page.$$(passwordSelectors);

  // 遍历每个输入框并输入密码
  for (const input of passwordInputs) {
    await input.type('12345678', {delay: 0});
  }
  console.log('已输入密码');

  await clickButton(page, "密码确认");

  await clickButton(page, "开启你的 Web3 之旅");
}

async function clickButton(page: Page, buttonText: string, selector: string = 'button[data-testid="okd-button"]:not([disabled])'): Promise<void> {
  try {
    await page.waitForSelector(selector, {
      visible: true,
      timeout: 10000
    });
    await page.click(selector);
    console.log(`已点击 "${buttonText}"按钮`);
  } catch (error) {
    console.error(`点击"${buttonText}"按钮时出错:`, error);
  }
}

async function getOkxwallet(): Promise<any> {
  const crxPath = path.join(process.cwd(), 'okxwallet.crx');
  const extractPath = path.join(process.cwd(), 'okxwallet-extension');

  // 检查文件是否已存在
  if (await fs.pathExists(crxPath)) {
    console.log('okxwallet.crx already exists. Skipping download.');
  } else {
    const url = 'https://file-1304641378.cos.ap-shanghai.myqcloud.com/okxwallet.crx';
    await downloadCRX(url, crxPath);
  }

  await extractCRX(crxPath, extractPath);
  // 获取并返回 startBrowser 的返回值
  await startBrowser(extractPath);

  // Cleanup: Remove only the extracted directory after testing
  await fs.remove(extractPath);
  console.log('Cleanup complete: Removed extracted files.');
}

getOkxwallet();
