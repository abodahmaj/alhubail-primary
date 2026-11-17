from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path(__file__).parent/'qa';out.mkdir(exist_ok=True);results=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 for width in [320,375,640,768,960,1280,1440,1920]:
  page.set_viewport_size({'width':width,'height':950});page.goto('http://127.0.0.1:8317');page.wait_for_load_state('networkidle')
  assert page.locator('.brand img').evaluate('(i)=>i.complete&&i.naturalWidth>0')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('login overflow',width)
  if width in [375,768,1440]:page.screenshot(path=str(out/f'login-{width}.png'),full_page=True)
  page.locator('#preview').click()
  for name in ['overview','grades','reports','account']:
   page.locator(f'nav button[data-page="{name}"]').click()
   assert page.locator('#'+name).is_visible()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),('overflow',name,width)
   if name in ['overview','grades'] and width in [375,768,1440]:page.screenshot(path=str(out/f'{name}-{width}.png'),full_page=True)
  page.locator('nav button[data-page="grades"]').click();page.locator('#grade').select_option(label='الأول الابتدائي');assert page.locator('#subject option').count()==2
  page.locator('#grade').select_option(label='السادس الابتدائي');assert page.locator('#subject option').count()==4
  page.locator('nav button[data-page="reports"]').click();page.locator('[data-report="مقارنة الفترتين"]').click();assert 'بانتظار القياسين' in page.locator('#report-message').inner_text()
  assert page.locator('footer').inner_text()=='صمم بواسطة أ. أفراح عسيري'
  assert 'مبادرة' not in page.locator('body').inner_text()
  page.locator('#exit').click();assert page.locator('#login').is_visible()
  results.append({'width':width,'passed':True,'checks':['logo','document overflow all views','navigation','subject rules','report tabs','credit','no prohibited term','exit']})
 assert not errors,errors
 b.close()
(out/'results.json').write_text(json.dumps({'viewports':results,'js_errors':errors,'backend_connected':False},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'viewports_passed':len(results),'js_errors':errors,'screenshots':len(list(out.glob('*.png')))},ensure_ascii=False))
