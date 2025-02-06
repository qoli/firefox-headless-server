/**
 * 為 DOM 元素生成 XPath
 * @param element - 目標 DOM 元素
 * @returns XPath 字符串
 */
export function getXPath(element: Element): string {
  if (!element.parentElement) {
    return '/' + element.tagName.toLowerCase();
  }
  
  let siblings = Array.from(element.parentElement.children);
  let count = 0;
  let index = -1;
  
  for (let i = 0; i < siblings.length; i++) {
    if (siblings[i].tagName === element.tagName) {
      count++;
    }
    if (siblings[i] === element) {
      index = count;
    }
  }
  
  const position = count === 1 ? '' : `[${index}]`;
  return getXPath(element.parentElement) + '/' + element.tagName.toLowerCase() + position;
}

/**
 * 獲取元素的所有可能的定位器信息
 * @param element - DOM 元素
 * @returns 定位器字符串數組
 */
export function getElementLocators(element: Element): string[] {
  const locators: string[] = [];

  // 1. ID 選擇器
  if (element.id) {
    locators.push(`#${element.id}`);
  }

  // 2. Name 屬性
  const name = element.getAttribute('name');
  if (name) {
    locators.push(`[name="${name}"]`);
  }

  // 3. Class 選擇器
  if (element.className) {
    const classes = element.className.split(' ').filter(Boolean);
    if (classes.length > 0) {
      locators.push('.' + classes.join('.'));
    }
  }

  // 4. Tag name 和 type 屬性組合
  const type = element.getAttribute('type');
  if (type) {
    locators.push(`${element.tagName.toLowerCase()}[type="${type}"]`);
  } else {
    locators.push(element.tagName.toLowerCase());
  }

  // 5. XPath
  locators.push(getXPath(element));

  return locators;
}

/**
 * 組合多個定位器為一個複合定位器
 * @param locators - 定位器字符串數組
 * @returns 複合定位器字符串
 */
export function combineLocators(locators: string[]): string {
  return locators.join(', ');
}