/**
 * ====================================================================
 * [구글 스프레드시트용 Apps Script 코드 (신청 및 취소 지원 버전)]
 * 
 * 구글 스프레드시트 상단 메뉴 [확장 프로그램] -> [Apps Script]를 열고,
 * 기존 코드를 모두 지운 후 아래 코드를 그대로 붙여넣으세요.
 * 저장 후 [배포] -> [배포 관리] -> [수정] -> [새 버전]으로 배포하세요.
 * ====================================================================
 */

// 1. 선착순 모집 정원 설정
const MAX_APPLICANTS = 30; // 원하는 인원수로 변경하세요.

/**
 * Vercel 웹사이트에서 신청 또는 취소 요청이 들어왔을 때 실행되는 함수입니다.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // 10초 대기 잠금 (동시성 방어)

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // 시트 첫 줄(헤더)이 비어있으면 자동으로 만들어 줍니다.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["신청일시", "이름", "학교", "전화번호"]);
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action || "apply"; // 기본값은 '신청'

    // ==========================================
    // [모드 1] 신청 취소 처리 (action === "cancel")
    // ==========================================
    if (action === "cancel") {
      const targetName = (data.userName || "").trim();
      const targetPhone = (data.phoneNumber || "").trim().replace(/[^0-9-]/g, "");

      if (!targetName || !targetPhone) {
        return makeResponse("error", "취소할 이름과 전화번호를 입력해 주세요.");
      }

      const rows = sheet.getDataRange().getValues();
      let foundIndex = -1;

      // 시트에서 이름과 전화번호가 일치하는 신청자 찾기
      for (let i = 1; i < rows.length; i++) {
        const rowName = String(rows[i][1]).trim();
        const rowPhone = String(rows[i][3]).trim().replace(/[^0-9-]/g, "");

        if (rowName === targetName && rowPhone === targetPhone) {
          foundIndex = i + 1; // 실제 시트 행 번호 (1-indexed)
          break;
        }
      }

      if (foundIndex === -1) {
        return makeResponse("error", "일치하는 신청 내역을 찾을 수 없습니다. 이름과 전화번호를 다시 확인해 주세요.");
      }

      // 일치하는 행을 삭제하여 신청 취소 처리 (정원 1자리 자동 확보)
      sheet.deleteRow(foundIndex);

      const remainingCount = Math.max(0, sheet.getLastRow() - 1);
      return makeResponse(
        "success", 
        targetName + "님의 참가 신청이 정상적으로 취소되었습니다.<br>(현재 접수 현황: " + remainingCount + " / " + MAX_APPLICANTS + "명)"
      );
    }

    // ==========================================
    // [모드 2] 참가 신청 처리 (action === "apply")
    // ==========================================
    const currentCount = Math.max(0, sheet.getLastRow() - 1);

    // 1) 정원 마감 검사
    if (currentCount >= MAX_APPLICANTS) {
      return makeResponse("closed", "모집 정원(" + MAX_APPLICANTS + "명)이 모두 마감되었습니다.");
    }

    // 2) 데이터 유효성 검증
    let userName = (data.userName || "").trim();
    let schoolName = (data.schoolName || "").trim();
    let phoneNumber = (data.phoneNumber || "").trim().replace(/[^0-9-]/g, "");

    if (!userName || !schoolName || !phoneNumber) {
      return makeResponse("error", "모든 항목을 올바르게 입력해 주세요.");
    }
    if (userName.length > 20 || schoolName.length > 30 || phoneNumber.length > 15) {
      return makeResponse("error", "입력 글자 수가 너무 깁니다.");
    }

    // 3) 중복 신청 방지
    const existingData = sheet.getDataRange().getValues();
    for (let i = 1; i < existingData.length; i++) {
      const existingPhone = String(existingData[i][3]).trim().replace(/[^0-9-]/g, "");
      if (existingPhone === phoneNumber) {
        return makeResponse("error", "이미 해당 전화번호로 신청이 완료된 내역이 있습니다.");
      }
    }

    // 4) 수식 인젝션 방어
    userName = sanitizeForSheet(userName);
    schoolName = sanitizeForSheet(schoolName);
    phoneNumber = sanitizeForSheet(phoneNumber);

    // 시트에 새 신청자 한 줄 기록
    const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    sheet.appendRow([now, userName, schoolName, phoneNumber]);

    const newCount = currentCount + 1;
    return makeResponse(
      "success", 
      newCount + "번째로 접수되었습니다! (총 정원: " + MAX_APPLICANTS + "명)"
    );

  } catch (error) {
    return makeResponse("error", "서버 오류: " + error.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * 수식 문자(=, +, -, @)로 시작할 경우 일반 텍스트로 처리하는 안전 함수입니다.
 */
function sanitizeForSheet(text) {
  if (typeof text === "string" && /^[=+\-@]/.test(text)) {
    return "'" + text;
  }
  return text;
}

/**
 * JSON 응답 생성 헬퍼 함수
 */
function makeResponse(status, message) {
  return ContentService.createTextOutput(JSON.stringify({
    status: status,
    message: message
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 브라우저에서 직접 링크를 열었을 때 안내 메시지
 */
function doGet(e) {
  return ContentService.createTextOutput("신청 및 취소 접수 API가 정상 동작 중입니다.");
}
