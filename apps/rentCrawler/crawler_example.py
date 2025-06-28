"""
簡單的網頁爬蟲示例 - 抓取PTT首頁的標題
"""
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException, InvalidSessionIdException
import pickle
import os
import random
import traceback
import tempfile
import shutil

# 全局變數以存儲日誌文件夾路徑
LOG_FOLDER = "logs"
if not os.path.exists(LOG_FOLDER):
    os.makedirs(LOG_FOLDER)

def is_session_valid(browser):
    """檢查瀏覽器會話是否有效"""
    try:
        # 嘗試獲取當前URL，這是一個簡單的操作來檢查會話是否有效
        current_url = browser.current_url
        return True
    except (InvalidSessionIdException, WebDriverException):
        return False

def safe_execute(browser, func, error_msg="操作失敗", *args, **kwargs):
    """安全執行瀏覽器操作，處理無效會話等異常"""
    if not is_session_valid(browser):
        print("瀏覽器會話無效，無法執行操作")
        return None
    
    try:
        return func(*args, **kwargs)
    except InvalidSessionIdException:
        print(f"執行時會話已失效: {error_msg}")
        return None
    except WebDriverException as e:
        print(f"瀏覽器操作錯誤: {error_msg} - {e}")
        return None
    except Exception as e:
        print(f"一般錯誤: {error_msg} - {e}")
        return None

def handle_pixiv_login(browser, username, password):
    """使用Cookie管理Pixiv登入狀態"""
    cookie_file = "pixiv_cookies.pkl"
    
    # 嘗試使用保存的Cookie
    if os.path.exists(cookie_file):
        try:
            # 確保瀏覽器會話有效
            if not is_session_valid(browser):
                print("Cookie載入前瀏覽器會話已失效")
                return False
                
            # 先訪問Pixiv域名以設置Cookie
            browser.get("https://www.pixiv.net")
            
            # 加載已保存的Cookie
            with open(cookie_file, "rb") as f:
                cookies = pickle.load(f)
                for cookie in cookies:
                    # 某些cookie可能會導致問題，需要進行處理
                    if 'expiry' in cookie:
                        del cookie['expiry']
                    try:
                        if is_session_valid(browser):
                            browser.add_cookie(cookie)
                    except:
                        pass
            
            # 確保瀏覽器會話仍然有效
            if not is_session_valid(browser):
                print("Cookie設置後瀏覽器會話已失效")
                return False
                
            # 刷新頁面以應用Cookie
            browser.refresh()
            time.sleep(3)
            
            # 檢查是否已登入
            if check_login_status(browser):
                print("使用Cookie成功登入")
                return True
            else:
                print("Cookie已過期，需要重新登入")
        except Exception as e:
            print(f"讀取Cookie出錯: {e}")
    
    # 如果沒有Cookie或Cookie無效，執行登入
    try:
        if login_pixiv(browser, username, password):
            # 確保會話有效後保存Cookie
            if is_session_valid(browser):
                save_cookies(browser, cookie_file)
                return True
            else:
                print("登入成功但會話已失效，無法保存Cookie")
                return False
        return False
    except Exception as e:
        print(f"登入過程發生錯誤: {e}")
        return False

def check_login_status(browser):
    """檢查是否已登入Pixiv"""
    # 先確認會話是否有效
    if not is_session_valid(browser):
        print("檢查登入狀態時會話已失效")
        return False
        
    # 檢查頁面是否包含登入後才會顯示的元素
    try:
        # 多種可能的登入狀態指標
        selectors = [
            ".sc-awnykw-1",                  # 可能的用戶頭像
            "a[href='/logout.php']",         # 登出連結
            "a[href*='setting']",            # 設置連結
            "a[href*='bookmark']",           # 收藏連結
            ".user-name",                    # 用戶名
            "[aria-label='用戶名稱']",        # 日文界面用戶名
            ".sc-2o1uwj-3",                  # Pixiv新UI中的其他元素
            "#root header nav li:nth-child(5)"  # 導航欄中的用戶相關項
        ]
        
        for selector in selectors:
            elements = safe_execute(browser, browser.find_elements, 
                                   f"查找選擇器 {selector}", By.CSS_SELECTOR, selector)
            if elements and len(elements) > 0:
                print(f"通過選擇器 '{selector}' 確認已登入")
                return True
        
        # 使用XPath查找更複雜的元素組合
        xpaths = [
            "//a[contains(@href, '/dashboard')]",  # 儀表板連結
            "//a[contains(@href, '/bookmarks')]",  # 收藏連結
            "//div[contains(@id, 'user-icon')]",   # 用戶圖標
            "//button[contains(@class, 'profile')]" # 個人資料按鈕
        ]
        
        for xpath in xpaths:
            elements = safe_execute(browser, browser.find_elements, 
                                   f"查找XPath {xpath}", By.XPATH, xpath)
            if elements and len(elements) > 0:
                print(f"通過XPath '{xpath}' 確認已登入")
                return True
        
        # 確保會話仍然有效
        if not is_session_valid(browser):
            print("JavaScript檢查前會話已失效")
            return False
            
        # 最後嘗試使用JavaScript檢查
        is_logged_in = safe_execute(browser, browser.execute_script, "執行JavaScript檢查登入狀態", """
            // 檢查是否存在登出連結或用戶相關元素
            return Boolean(
                document.querySelector('a[href*="logout"]') || 
                document.querySelector('a[href*="user"]') ||
                document.querySelector('a[href*="dashboard"]') ||
                document.querySelector('.user-name')
            );
        """)
        
        if is_logged_in:
            print("通過JavaScript確認已登入")
            return True
            
        print("未找到登入狀態指標，可能未登入")
        return False
    except Exception as e:
        print(f"檢查登入狀態時出錯: {e}")
        return False

def save_cookies(browser, filename):
    """保存Cookie到文件"""
    if not is_session_valid(browser):
        print("保存Cookie時會話已失效")
        return False
        
    try:
        with open(filename, "wb") as f:
            pickle.dump(browser.get_cookies(), f)
        print(f"Cookie已保存到 {filename}")
        return True
    except Exception as e:
        print(f"保存Cookie時出錯: {e}")
        return False

def setup_browser():
    """設置Chrome瀏覽器，增強反爬蟲能力"""
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from webdriver_manager.chrome import ChromeDriverManager
    
    # 創建臨時目錄作為用戶數據目錄
    temp_dir = tempfile.mkdtemp()
    print(f"使用臨時目錄作為Chrome用戶數據目錄: {temp_dir}")
    
    # 現代瀏覽器的使用者代理，定期更新
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0"
    ]
    user_agent = random.choice(user_agents)
    
    # 1. 最簡單的配置：僅使用必要的選項以提高穩定性
    try:
        print("嘗試使用簡化版參數創建Chrome瀏覽器...")
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--incognito")  # 使用隱身模式
        chrome_options.add_argument(f"--user-agent={user_agent}")
        
        # 不使用用戶數據目錄
        browser = webdriver.Chrome(options=chrome_options)
        print("簡化版Chrome瀏覽器實例創建成功!")
        
        # 設置超時等待
        browser.set_page_load_timeout(60)
        return browser
    except Exception as e:
        print(f"簡化版瀏覽器創建失敗: {e}")
        # 如果臨時目錄仍存在，嘗試刪除
        try:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
        except:
            pass
            
        # 2. 最小配置：在失敗時使用最小化配置
        try:
            print("嘗試使用最小配置創建Chrome瀏覽器...")
            chrome_options = Options()
            chrome_options.add_argument("--headless=new")
            chrome_options.add_argument("--no-sandbox")
            
            browser = webdriver.Chrome(options=chrome_options)
            print("最小配置Chrome瀏覽器實例創建成功!")
            return browser
        except Exception as e:
            print(f"最小配置瀏覽器創建失敗: {e}")
            raise e  # 如果連最小配置都失敗，則向上傳遞異常

def login_pixiv(browser, username, password):
    """改進的Pixiv登入功能，處理多種可能的登入頁面佈局"""
    
    # 檢查瀏覽器會話是否有效
    if not is_session_valid(browser):
        print("登入前瀏覽器會話已失效")
        return False
    
    try:
        # 直接訪問登入頁面前先訪問首頁並等待
        safe_execute(browser, browser.get, "訪問Pixiv首頁", "https://www.pixiv.net")
        time.sleep(3)
        
        # 檢查會話是否仍然有效
        if not is_session_valid(browser):
            print("訪問首頁後會話已失效")
            return False
        
        # 進入登入頁面前的隨機延遲
        random_delay = random.uniform(1.5, 3.5)
        time.sleep(random_delay)
        
        # 直接訪問登入頁面
        safe_execute(browser, browser.get, "訪問登入頁面", "https://accounts.pixiv.net/login")
        print("已打開登入頁面")
        time.sleep(5)  # 給足載入時間
        
        # 檢查會話是否仍然有效
        if not is_session_valid(browser):
            print("訪問登入頁面後會話已失效")
            return False
        
        # 保存登入頁面截圖以便分析
        safe_execute(browser, browser.save_screenshot, "保存登入頁面截圖", f"{LOG_FOLDER}/pixiv_login_page.png")
        print("已截圖登入頁面")
        
        # 確保會話仍然有效
        if not is_session_valid(browser):
            print("截圖後會話已失效")
            return False
        
        # 保存HTML以便分析
        try:
            page_source = safe_execute(browser, lambda: browser.page_source, "獲取頁面源碼")
            if page_source:
                with open(f"{LOG_FOLDER}/login_page.html", "w", encoding="utf-8") as f:
                    f.write(page_source)
        except Exception as e:
            print(f"保存頁面源碼出錯: {e}")
        
        # 等待頁面完全加載 - 使用顯式等待
        try:
            # 嘗試等待登入表單出現
            form_selectors = [
                "form", 
                ".signup-form",
                "#LoginComponent",
                "input[type='password']"
            ]
            
            for selector in form_selectors:
                try:
                    if is_session_valid(browser):
                        WebDriverWait(browser, 10).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                        )
                        print(f"找到登入表單元素: {selector}")
                        break
                except TimeoutException:
                    print(f"等待選擇器 {selector} 超時")
                    continue
        except Exception as e:
            print(f"等待頁面載入時出錯: {e}")
        
        # 再次確保會話有效
        if not is_session_valid(browser):
            print("表單等待後會話已失效")
            return False
        
        # 執行簡化版的登入流程
        login_success = False
        
        # 1. 使用JavaScript填寫表單
        try:
            print("嘗試使用JavaScript登入...")
            if is_session_valid(browser):
                script_result = safe_execute(browser, browser.execute_script, "執行登入表單JavaScript", """
                    // 查找所有可能的輸入元素
                    var usernameInput = document.querySelector('input[type="text"][autocomplete="username"], input[type="email"], input[name="pixivId"], input[name="email"]');
                    var passwordInput = document.querySelector('input[type="password"]');
                    var loginButton = document.querySelector('button[type="submit"], button.signup-form__submit, form button');
                    
                    if(usernameInput && passwordInput && loginButton) {
                        // 直接填寫登入信息
                        usernameInput.value = arguments[0];
                        passwordInput.value = arguments[1];
                        
                        // 點擊登入按鈕
                        setTimeout(function() {
                            loginButton.click();
                        }, 500);
                        
                        return true;
                    }
                    return false;
                """, username, password)
                
                if script_result:
                    print("JavaScript登入表單填寫成功，等待登入結果...")
                    time.sleep(10)  # 給足時間讓登入請求完成
            else:
                print("JavaScript登入時會話已失效")
        except Exception as e:
            print(f"JavaScript登入出錯: {e}")
        
        # 檢查是否已成功登入
        if is_session_valid(browser) and check_login_status(browser):
            print("JavaScript登入成功!")
            login_success = True
        
        # 2. 如果JavaScript登入失敗，使用Selenium API
        if not login_success and is_session_valid(browser):
            try:
                print("嘗試使用Selenium API登入...")
                
                # 使用各種選擇器嘗試查找用戶名輸入框
                username_field = None
                for selector in ["input[type='text']", "input[type='email']", "input[name='pixivId']", "input[name='email']"]:
                    try:
                        if is_session_valid(browser):
                            username_field = browser.find_element(By.CSS_SELECTOR, selector)
                            if username_field:
                                print(f"找到用戶名輸入框: {selector}")
                                break
                    except Exception:
                        continue
                
                # 使用各種選擇器嘗試查找密碼輸入框
                password_field = None
                for selector in ["input[type='password']"]:
                    try:
                        if is_session_valid(browser):
                            password_field = browser.find_element(By.CSS_SELECTOR, selector)
                            if password_field:
                                print(f"找到密碼輸入框: {selector}")
                                break
                    except Exception:
                        continue
                
                # 填寫登入表單
                if username_field and password_field and is_session_valid(browser):
                    username_field.clear()
                    username_field.send_keys(username)
                    
                    password_field.clear()
                    password_field.send_keys(password)
                    
                    # 尋找並點擊登入按鈕
                    login_button = None
                    for selector in ["button[type='submit']", "button.login-submit", "form button"]:
                        try:
                            if is_session_valid(browser):
                                login_button = browser.find_element(By.CSS_SELECTOR, selector)
                                if login_button:
                                    print(f"找到登入按鈕: {selector}")
                                    break
                        except Exception:
                            continue
                    
                    if login_button and is_session_valid(browser):
                        login_button.click()
                        print("點擊登入按鈕")
                        time.sleep(10)  # 等待登入請求完成
                    else:
                        # 如果找不到按鈕，嘗試按回車鍵
                        password_field.send_keys("\n")
                        print("使用Enter鍵提交表單")
                        time.sleep(10)  # 等待登入請求完成
            except Exception as e:
                print(f"Selenium API登入出錯: {e}")
        
        # 等待一段時間並檢查登入狀態
        time.sleep(5)
        
        # 最終確認是否登入成功
        if is_session_valid(browser):
            # 嘗試獲取當前URL
            current_url = safe_execute(browser, lambda: browser.current_url, "獲取當前URL")
            if current_url:
                print(f"登入後URL: {current_url}")
            
            # 保存登入後的截圖
            safe_execute(browser, browser.save_screenshot, "保存登入後截圖", f"{LOG_FOLDER}/pixiv_after_login.png")
            
            # 檢查登入狀態
            login_success = check_login_status(browser)
            if login_success:
                print("✅ 登入成功!")
                return True
            else:
                print("❌ 登入可能失敗，檢查截圖查看問題")
                # 保存頁面源碼以便分析
                try:
                    page_source = safe_execute(browser, lambda: browser.page_source, "獲取登入後頁面源碼")
                    if page_source:
                        with open(f"{LOG_FOLDER}/login_failed_page.html", "w", encoding="utf-8") as f:
                            f.write(page_source)
                except Exception as e:
                    print(f"保存登入失敗頁面源碼出錯: {e}")
                return False
        else:
            print("登入過程完成後會話已失效")
            return False
            
    except Exception as e:
        print(f"登入過程中發生未處理的錯誤: {e}")
        print(traceback.format_exc())
        return False

def crawl_pixiv_with_login():
    """整合登入功能的Pixiv爬蟲"""
    username = "akiralawlite@gmail.com"  # 替換為您的用戶名
    password = "BNM91422531"  # 替換為您的密碼
    
    # 嘗試創建瀏覽器實例
    try:
        browser = setup_browser()
    except Exception as e:
        print(f"無法創建瀏覽器實例: {e}")
        return
    
    try:
        # 處理登入
        if not handle_pixiv_login(browser, username, password):
            print("登入失敗，無法繼續爬取")
            browser.quit()
            return
        
        # 確認登入成功 - 額外截圖
        if is_session_valid(browser):
            print("確認登入成功，準備訪問作品頁面")
            safe_execute(browser, browser.save_screenshot, "保存登入成功狀態", f"{LOG_FOLDER}/pixiv_login_confirmed.png")
            
            # 訪問首頁並截圖
            safe_execute(browser, browser.get, "訪問Pixiv首頁", "https://www.pixiv.net")
            time.sleep(3)
            safe_execute(browser, browser.save_screenshot, "保存Pixiv首頁", f"{LOG_FOLDER}/pixiv_homepage.png")
            print("已保存Pixiv首頁截圖")
        
        # 檢查瀏覽器會話是否有效
        if not is_session_valid(browser):
            print("登入後瀏覽器會話已失效")
            try:
                browser.quit()
            except:
                pass
            return
        
        # 登入成功，訪問目標頁面
        url = "https://www.pixiv.net/users/810034/artworks"
        print(f"訪問藝術家頁面: {url}")
        safe_execute(browser, browser.get, "訪問藝術家頁面", url)
        
        # 檢查瀏覽器會話是否仍然有效
        if not is_session_valid(browser):
            print("訪問藝術家頁面後瀏覽器會話已失效")
            try:
                browser.quit()
            except:
                pass
            return
        
        # 等待頁面加載
        print("等待頁面加載...")
        time.sleep(5)
        
        # 保存頁面截圖以便分析 - 初始狀態
        safe_execute(browser, browser.save_screenshot, "保存藝術家頁面初始狀態", f"{LOG_FOLDER}/pixiv_artist_page_initial.png")
        print("已保存藝術家頁面初始狀態截圖")
        
        # 模擬滾動並截圖
        print("模擬滾動頁面以加載更多內容...")
        scroll_positions = [300, 600, 900, 1200]
        for i, pos in enumerate(scroll_positions):
            if is_session_valid(browser):
                safe_execute(browser, browser.execute_script, f"滾動到位置 {pos}", f"window.scrollTo(0, {pos});")
                time.sleep(1)
                safe_execute(browser, browser.save_screenshot, f"保存滾動位置 {i+1}", f"{LOG_FOLDER}/pixiv_artist_scroll_{i+1}.png")
                print(f"已保存滾動位置 {i+1} 的截圖")
        
        # 保存完整頁面截圖
        safe_execute(browser, browser.save_screenshot, "保存藝術家頁面最終狀態", f"{LOG_FOLDER}/pixiv_artist_page_final.png")
        print("已保存藝術家頁面最終狀態截圖")
        
        # 保存頁面源碼以便分析
        try:
            page_source = safe_execute(browser, lambda: browser.page_source, "獲取藝術家頁面源碼")
            if page_source:
                with open(f"{LOG_FOLDER}/pixiv_artist_page.html", "w", encoding="utf-8") as f:
                    f.write(page_source)
                print("藝術家頁面源碼已保存")
        except Exception as e:
            print(f"保存藝術家頁面源碼出錯: {e}")
        
        # 檢查瀏覽器會話是否仍然有效
        if not is_session_valid(browser):
            print("保存頁面源碼後瀏覽器會話已失效")
            try:
                browser.quit()
            except:
                pass
            return
        
        # 嘗試查找作品元素
        print("嘗試查找作品元素...")
        artwork_links = safe_execute(browser, browser.find_elements, "查找作品連結", 
                                   By.CSS_SELECTOR, "a[href*='/artworks/']")
        
        if artwork_links and len(artwork_links) > 0:
            print(f"找到 {len(artwork_links)} 個作品連結")
            
            # 創建作品截圖文件夾
            artwork_folder = f"{LOG_FOLDER}/artworks"
            if not os.path.exists(artwork_folder):
                os.makedirs(artwork_folder)
            
            # 輸出前10個作品的標題和連結
            print("\n=== 藝術家作品 ===")
            for i, link in enumerate(artwork_links[:10], 1):
                try:
                    if is_session_valid(browser):
                        # 獲取作品信息
                        title = safe_execute(link, link.get_attribute, f"獲取作品{i}標題", "title") or "無標題"
                        href = safe_execute(link, link.get_attribute, f"獲取作品{i}連結", "href") or "無連結"
                        print(f"{i}. {title} - {href}")
                        
                        # 嘗試捲動到元素位置並截圖
                        try:
                            # 將視圖滾動到作品元素
                            safe_execute(browser, browser.execute_script, f"滾動到作品 {i}", "arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", link)
                            time.sleep(1)
                            
                            # 高亮顯示元素
                            safe_execute(browser, browser.execute_script, f"高亮作品 {i}", """
                                arguments[0].style.border = '3px solid red';
                                arguments[0].style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                            """, link)
                            
                            # 截圖保存
                            safe_execute(browser, browser.save_screenshot, f"保存作品 {i} 截圖", f"{artwork_folder}/artwork_{i}.png")
                            print(f"已保存作品 {i} 的截圖")
                            
                            # 恢復元素樣式
                            safe_execute(browser, browser.execute_script, f"恢復作品 {i} 樣式", """
                                arguments[0].style.border = '';
                                arguments[0].style.backgroundColor = '';
                            """, link)
                        except Exception as e:
                            print(f"截圖作品 {i} 時出錯: {e}")
                except Exception as e:
                    print(f"{i}. 無法獲取作品信息: {e}")
            
            # 嘗試訪問第一個作品詳情頁
            if len(artwork_links) > 0 and is_session_valid(browser):
                try:
                    first_artwork_href = safe_execute(artwork_links[0], artwork_links[0].get_attribute, "獲取第一個作品連結", "href")
                    if first_artwork_href:
                        print(f"訪問第一個作品詳情頁: {first_artwork_href}")
                        safe_execute(browser, browser.get, "訪問作品詳情頁", first_artwork_href)
                        time.sleep(5)  # 等待頁面加載
                        
                        # 保存作品詳情頁截圖
                        safe_execute(browser, browser.save_screenshot, "保存作品詳情頁", f"{LOG_FOLDER}/artwork_detail_page.png")
                        print("已保存作品詳情頁截圖")
                        
                        # 嘗試保存作品大圖
                        try:
                            img_elem = safe_execute(browser, browser.find_element, "查找作品大圖", By.CSS_SELECTOR, "img[alt], figure img, main img")
                            if img_elem:
                                # 將視圖滾動到圖片元素
                                safe_execute(browser, browser.execute_script, "滾動到大圖", "arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", img_elem)
                                time.sleep(1)
                                safe_execute(browser, browser.save_screenshot, "保存作品大圖", f"{LOG_FOLDER}/artwork_large_image.png")
                                print("已保存作品大圖截圖")
                        except Exception as e:
                            print(f"保存作品大圖時出錯: {e}")
                except Exception as e:
                    print(f"訪問作品詳情頁時出錯: {e}")
        else:
            print("未能找到任何作品連結")
            # 多次嘗試不同的選擇器
            for selector in ["div[type='illust']", "article a", ".sc-9y4be5-1", "[data-gtm-value]"]:
                elements = safe_execute(browser, browser.find_elements, f"使用選擇器 {selector} 查找", By.CSS_SELECTOR, selector)
                if elements and len(elements) > 0:
                    print(f"使用選擇器 {selector} 找到 {len(elements)} 個元素 {elements[0].text}")
                    # 截圖以便分析
                    safe_execute(browser, browser.save_screenshot, f"使用選擇器 {selector} 後", f"{LOG_FOLDER}/selector_{selector.replace('[', '_').replace(']', '_').replace('*', '_')}.png")
            
    except Exception as e:
        print(f"爬蟲過程中發生錯誤: {e}")
        print(traceback.format_exc())
        
        # 保存錯誤狀態截圖
        if 'browser' in locals() and browser and is_session_valid(browser):
            safe_execute(browser, browser.save_screenshot, "保存錯誤狀態", f"{LOG_FOLDER}/error_state.png")
            
    finally:
        # 在結束時安全地關閉瀏覽器
        try:
            if 'browser' in locals() and browser:
                browser.quit()
                print("瀏覽器已關閉")
        except Exception as e:
            print(f"關閉瀏覽器時出錯: {e}")
        print("爬蟲結束")

if __name__ == "__main__":
    # 使用更穩定的登入功能爬取Pixiv
    crawl_pixiv_with_login()