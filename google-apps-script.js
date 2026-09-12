/**
 * ====================================================================
 * [구글 스프레드시트용 Apps Script 코드]
 * 
 * 구글 스프레드시트 상단 메뉴 [확장 프로그램] -> [Apps Script]를 열고,
 * 기존 코드를 모두 지운 후 아래 코드를 그대로 붙여넣으세요.
 * ====================================================================
 */

// 1. 선착순 모집 정원 설정
const MAX_APPLICANTS = 30; // 원하는 인원수로 변경하세요.

/**
 * Vercel 웹사이트에서 신청서를 보냈을 때(POST 요청) 실행되는 함수입니다.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // 동시 접속자가 많을 때 순서가 꼬이지 않도록 10초간 대기 잠금(Lock)을 겁니다.
  lock.tryLock(10000);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // 시트 첫 줄(헤더)이 비어있으면 자동으로 만들어 줍니다.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["신청일시", "이름", "학교", "전화번호"]);
    }

    // 현재 접수된 인원 계산 (첫 줄 제목 제외)
    const currentCount = Math.max(0, sheet.getLastRow() - 1);

    // 2. 이미 정원이 찼다면 마감 처리
    if (currentCount >= MAX_APPLICANTS) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "closed",
        message: "모집 정원(" + MAX_APPLICANTS + "명)이 모두 마감되었습니다."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. 사용자가 입력한 데이터 읽어오기
    const data = JSON.parse(e.postData.contents);
    const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

    // 시트에 새 신청자 한 줄 기록
    sheet.appendRow([now, data.userName, data.schoolName, data.phoneNumber]);

    const newCount = currentCount + 1;

    // 4. 성공 결과 반환
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: newCount + "번째로 접수되었습니다. (정원: " + MAX_APPLICANTS + "명)",
      currentCount: newCount
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    // 잠금 해제
    lock.releaseLock();
  }
}

/**
 * 브라우저에서 직접 링크를 열었을 때 안내 메시지를 보여주는 함수입니다.
 */
function doGet(e) {
  return ContentService.createTextOutput(
    "구글 스프레드시트 신청 접수 API가 정상 동작 중입니다."
  );
}
