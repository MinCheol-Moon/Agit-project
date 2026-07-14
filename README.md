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

```bash
supabase link --project-ref <project-ref>
supabase db push                       # supabase/migrations 적용 (스키마 + RLS + pg_cron + storage)
supabase functions deploy ocr-receipt
supabase functions deploy send-push
supabase secrets set CLOVA_OCR_API_URL=... CLOVA_OCR_SECRET_KEY=...
```

pg_cron이 Edge Function을 호출하도록 DB 설정값을 지정해야 합니다 (`0004_push_notifications.sql` 참고):

```sql
alter database postgres set app.settings.edge_function_url = 'https://<project-ref>.functions.supabase.co';
alter database postgres set app.settings.service_role_key = '<service-role-key>';
```

### 권한 모델 (등급 → rank)

`전체(0) / 랄잡(1) / 탈부착(2) / 탈주닌자(3) / 아카츠키(4)`. `src/lib/permissions.ts`가 프론트 게이트를,
`supabase/migrations/0002_rls.sql`이 서버 측 RLS를 담당합니다. 실명·연락처는 `users` 테이블에만 있고
일반 열람은 실명이 빠진 `member_directory` 뷰를 사용합니다 (아카츠키만 `real_name` 직접 열람, 열람 시 `real_name_view_logs`에 기록).

### 자동 승급/강등

`0003_tier_cron.sql`의 `run_monthly_tier_batch()`가 매월 1일 00:05(pg_cron)에 실행되어 전월 출석 횟수에 따라
승급(4회↑)/강등(0회)/탈퇴(3개월 연속 0회)를 처리하고 `tier_logs`에 기록합니다. 출석 체크인마다
`attendance_month`가 갱신되어 배치가 참조합니다.

## 미구현/제약 (스펙 12번 참고)

- 카카오뱅크 자동 연동 불가 → 캡처 OCR(CLOVA)로 대체. OCR 결과는 확정 전 수정 UI를 거칩니다.
- 위장 아이콘(iOS Alternate Icon / Android activity-alias)과 스토어 배포는 `/ios`, `/android` 네이티브
  프로젝트 생성(`expo prebuild`) 이후 설정이 필요하며 이 저장소에는 아직 포함되어 있지 않습니다.
