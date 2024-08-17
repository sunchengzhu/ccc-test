import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';
import puppeteer, { Page } from 'puppeteer';


async function extractCRX(crxPath: string, extractPath: string): Promise<void> {
  const data = await fs.promises.readFile(crxPath);
  const zip = new JSZip();
  const content = await zip.loadAsync(data);

  console.log('Extraction started...');
  await Promise.all(
    Object.keys(content.files).map(async filename => {
      const file = content.file(filename);
      if (file && !file.dir) {
        const fileData = await file.async("nodebuffer");
        const outputPath = path.join(extractPath, filename);
        await fs.promises.mkdir(path.dirname(outputPath), {recursive: true});
        await fs.promises.writeFile(outputPath, fileData);
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
      console.log('已点击 "导入已有钱包"按钮');

      // 等待并点击“助记词或私钥”
      await page.waitForSelector('div._wallet-space-item_1px67_9', {visible: true});
      await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('div._wallet-space-item_1px67_9'));
        const mnemonicOption = options.find(option => (option as HTMLElement).innerText.includes('助记词或私钥'));
        if (mnemonicOption instanceof HTMLElement) {
          mnemonicOption.click();
        }
      });
      console.log('已点击 "助记词或私钥"按钮');

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

      await page.close();

      browser.on('targetcreated', async (target) => {
        if (target.type() === 'page' && target.url().includes('notification.html#/dapp-entry')) {
          const newPopup = await target.page();
          if (newPopup) {
            try {
              // 等待可能的按钮可见
              await newPopup.waitForSelector('button[data-testid="okd-button"][data-e2e-okd-button-loading="false"]', {
                visible: true,
                timeout: 30000
              });
              // 获取所有匹配的按钮
              const buttons = await newPopup.$$(
                'button[data-testid="okd-button"][data-e2e-okd-button-loading="false"]'
              );
              // 循环检查每个按钮的文本，以找到“确认”按钮并点击
              for (const button of buttons) {
                const buttonText = await newPopup.evaluate(el => el.textContent.trim(), button);
                if (buttonText === "确认") {
                  await button.click();
                  console.log('已点击新插件页面 "确认"按钮');
                  break; // 成功点击后退出循环
                }
              }
            } catch (error) {
              console.error('Error while interacting with the new popup:', error);
            }
          }
        }
      });

      const signStr = 'CKB (Bitcoin Layer) transaction: 0x83d552400f7f3c80acbeb29664ee9a65c725179f5e9cf62f8b93c0e5dfe6d460'
      const result = await mainPage.evaluate((message) => {
        return okxwallet.bitcoinTestnet.signMessage(message, 'ecdsa');
      }, signStr);

      console.log(result);

      // 等待一段时间观察操作结果
      // await new Promise(resolve => setTimeout(resolve, 10000));

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

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

async function clickButton(page, buttonText, selector = 'button[data-testid="okd-button"]:not([disabled])', maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      // 等待元素可见并确保它未被禁用
      const button = await page.waitForSelector(selector, {
        visible: true,
        timeout: 10000
      });

      // 在点击前等待额外时间，确保页面状态稳定
      await delay(500); // 可根据实际需要调整

      // 点击按钮
      await button.click();
      console.log(`已点击 "${buttonText}"按钮`);
      return; // 如果成功，退出函数
    } catch (error) {
      // console.error(`点击"${buttonText}"按钮时出错: 尝试次数 ${retries + 1}`, error);
      console.error(`点击"${buttonText}"按钮时出错: 尝试次数 ${retries + 1}`);
      retries++;
      if (retries >= maxRetries) {
        console.error(`点击"${buttonText}"按钮失败: 达到最大重试次数`);
        throw error; // 抛出最后的错误
      }
    }
  }
}

async function getOkxwallet(): Promise<any> {
  const crxPath = path.join(process.cwd(), 'extension/okxwallet.crx');
  const extractPath = path.join(process.cwd(), 'extension/okxwallet-extension');

  await extractCRX(crxPath, extractPath);
  // 获取并返回 startBrowser 的返回值
  await startBrowser(extractPath);

  // Cleanup: Remove only the extracted directory after testing
  await fs.promises.rm(extractPath, {recursive: true, force: true});
  console.log('Removed extracted files.');
}

getOkxwallet();
