# 아지트 (Agit)

취미로 모이는 프라이빗 회원제 모임 앱. Expo(React Native) + Supabase.

## 실행

```bash
npm install
npm start        # Expo Go로 QR 스캔, 또는 --android / --ios
npm run web       # 웹 프리뷰 (스텔스/PIN/네비게이션 데모용, 일부 네이티브 기능 제한)
```

`.env.example`을 `.env`로 복사하고 Supabase 프로젝트 URL/anon key를 채우면 실제 백엔드에 연결됩니다.
값이 비어 있으면 `src/data/*`가 자동으로 인메모리 목업 데이터로 동작하여 백엔드 없이도 전체 플로우를 확인할 수 있습니다 (앱을 재시작하면 초기화됨).

## 폰트

디자인 시스템은 Pretendard를 지정하지만, 이 저장소에는 라이선스 바이너리를 포함하지 않았습니다.
현재는 `@expo-google-fonts/inter`로 대체되어 있습니다. Pretendard를 적용하려면:

1. `Pretendard-{Regular,Medium,SemiBold,Bold}.otf`를 `assets/fonts/`에 추가
2. `src/theme/typography.ts`를 `expo-font`의 `useFonts` + `require('../../assets/fonts/...')` 방식으로 교체

## 스텔스 진입

가계부 화면에서 "잔액" 텍스트 3회 탭 또는 로고 롱프레스(0.9초) → PIN 화면. 최초 실행 시 PIN을 설정합니다.

## Supabase 백엔드 설정

Supabase CLI 없이 대시보드만으로 세팅하는 순서 (제일 쉬움):

1. **Authentication → Sign In / Providers → Email**에서 **Confirm email을 OFF**로 설정.
   로그인은 이메일 없이 닉네임/실명 + 전화번호 뒷 4자리로 하지만, 내부적으로는 기기별 랜덤 가짜 이메일(`@agit.local`) 계정을 씁니다(`src/lib/session.ts`). 이 주소로는 실제 메일이 갈 수 없으니 확인 메일 요구가 켜져 있으면 가입 자체가 막힙니다.
2. **SQL Editor → New query**에 `supabase/bootstrap.sql` 전체를 붙여넣고 Run.
   (스키마 + RLS + pg_cron 월간 승급/강등 배치 + 회비/실명 로그 + 채팅방 시드 + 닉네임/실명 로그인용 RPC까지 한 번에 적용됩니다.)
3. `.env`에 Project URL / anon key를 넣고 `npx expo start`로 앱을 켠 뒤, **본인이 직접 가입 신청 폼을 제출**합니다 (이게 첫 `pending` 계정이 됨). 여기서 입력한 전화번호 뒷 4자리가 앞으로 로그인 비밀번호가 됩니다.
4. SQL Editor에서 `supabase/bootstrap.sql` 맨 아래에 있는 마스터 승격 쿼리를 본인 닉네임으로 채워서 실행:
   ```sql
   update users set is_master = true, tier = 'akatsuki', status = 'active'
     where nickname = '본인_닉네임';
   ```
   이후 앱을 재시작하면(`홈 → 새로고침`, 또는 완전 재실행) 아카츠키 권한으로 다른 가입 신청을 승인할 수 있습니다.

CLI를 쓸 수 있다면 위 2번 대신 아래로 대체 가능합니다 (동일한 내용을 번호순 마이그레이션 파일로 적용):

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy ocr-receipt
supabase functions deploy send-push
supabase secrets set CLOVA_OCR_API_URL=... CLOVA_OCR_SECRET_KEY=...
```

Edge Function(OCR, 푸시)은 CLI로만 배포할 수 있습니다. 배포 후 pg_cron이 입금일 알림 Edge Function을 호출하도록 DB 설정값을 지정하세요 (`0004_push_notifications.sql` 참고):

```sql
alter database postgres set app.settings.edge_function_url = 'https://<project-ref>.functions.supabase.co';
alter database postgres set app.settings.service_role_key = '<service-role-key>';
```

이 두 Edge Function을 배포하기 전까지는 OCR 업로드와 입금일 푸시 알림은 동작하지 않습니다 (다른 기능은 정상 동작).

### 권한 모델 (등급 → rank)

`전체(0) / 랄잡(1) / 탈부착(2) / 탈주닌자(3) / 아카츠키(4)`. `src/lib/permissions.ts`가 프론트 게이트를,
`supabase/migrations/0002_rls.sql`이 서버 측 RLS를 담당합니다. 실명·연락처는 `users` 테이블에만 있고
일반 열람은 실명이 빠진 `member_directory` 뷰를 사용합니다 (아카츠키만 `real_name` 직접 열람, 열람 시 `real_name_view_logs`에 기록).

### 로그인

이메일/커스텀 비밀번호 없이, **닉네임 또는 실명 + 가입 시 등록한 전화번호 뒷 4자리**로 로그인합니다.
숫자 입력은 매번 배열이 섞이는 키패드(`src/components/ShuffledKeypad.tsx`)로 받습니다. 이 로그인 플로우가
생기기 전(익명 세션 방식)에 만들어진 계정은 마이페이지의 "다른 기기 로그인 활성화" 버튼을 한 번 눌러야
다른 기기에서 로그인할 수 있습니다(같은 계정 데이터가 유지된 채로 비밀번호만 새로 붙습니다).

### 자동 승급/강등

`0003_tier_cron.sql`의 `run_monthly_tier_batch()`가 매월 1일 00:05(pg_cron)에 실행되어 전월 출석 횟수에 따라
승급(4회↑)/강등(0회)/탈퇴(3개월 연속 0회)를 처리하고 `tier_logs`에 기록합니다. 출석 체크인마다
`attendance_month`가 갱신되어 배치가 참조합니다.

## 미구현/제약 (스펙 12번 참고)

- 카카오뱅크 자동 연동 불가 → 캡처 OCR(CLOVA)로 대체. OCR 결과는 확정 전 수정 UI를 거칩니다.
- 위장 아이콘(iOS Alternate Icon / Android activity-alias)과 스토어 배포는 `/ios`, `/android` 네이티브
  프로젝트 생성(`expo prebuild`) 이후 설정이 필요하며 이 저장소에는 아직 포함되어 있지 않습니다.
