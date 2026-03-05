# dChat Code Audit - Missing Backend Functionality

## Already Implemented in Backend (Go)
1. Auth (nonce + wallet-login + me) ✅
2. Messages (send, get, conversations, mark read, recall, edit, forward, export) ✅
3. Groups (create, get, update, delete, members, announcements, join requests, group messages) ✅
4. Mentions (@mentions) ✅
5. File upload ✅
6. 2FA (setup, verify, disable, backup codes) ✅
7. Reports ✅
8. Admin dashboard ✅
9. Analytics ✅
10. Matching (recommendations, feedback) ✅
11. Meetings ✅
12. AI assistant ✅
13. Tickets ✅
14. Tasks ✅
15. Calendar ✅
16. Push notifications ✅
17. SSO ✅
18. GDPR ✅
19. DAO ✅
20. CRM ✅
21. Bots ✅
22. Pin conversations ✅
23. Privado ID verification ✅

## MISSING in Backend - Required by Frontend
1. **Profile CRUD** - Frontend calls `/api/profile/projects`, `/api/profile/skills`, `/api/profile/resources`, `/api/profile/seeking`, `/api/profile/business` — NO backend handler exists
2. **Friend System** - Frontend calls `/api/account/invite-friend` — NO backend handler exists; no Friend model
3. **NFC Friend Add** - Frontend uses Web NFC API (browser-side only), saves to localStorage — no backend integration
4. **User Profile Update** - Frontend `UserProfileService` saves to localStorage only — no backend sync
5. **Profile Update API** - No `PUT /api/auth/me` or similar endpoint to update user name, company, position, bio

## MISSING Models
1. Friend / FriendRequest model
2. UserSkill model
3. UserProject model (profile projects, not the existing Project model)
4. UserResource model
5. UserSeeking model
6. UserBusiness model

## Frontend Issues
- ProfileEditDialog calls 5 profile sub-endpoints that don't exist in backend
- InviteFriend calls `/api/account/invite-friend` which doesn't exist
- OpportunityMatching uses blockchain contract calls (LivingPortfolioService) — works client-side
- UserProfileService stores everything in localStorage — needs backend sync
