# AutoDark — Project Context

## What It Is
AutoDark é uma plataforma de automação de canais YouTube. O operador cria um canal, define o DNA (nicho, voz, narrativa), e a IA gera o vídeo completo: roteiro → narração TTS → imagens por cena → montagem → SEO → publicação com aprovação humana.

## The Real Problem
O pipeline **existe no código mas não funciona na prática**. Ninguém consegue gerar um vídeo de ponta a ponta. O Studio (onde o vídeo é montado e exportado) não está integrado ao pipeline de produção de forma confiável. Blocos de Foundation incompletos. Renderização não exporta MP4 real.

## Target User
- Grilo (CEO/cliente principal) — vai gerenciar muitos canais em inglês/espanhol
- Operadores que gerenciam N canais simultaneamente

## Core Product Decisions (travadas)
- Idioma: inglês + espanhol (RPM alto). PT-BR secundário.
- Formato: SEMPRE landscape 16:9
- TTS: AI-33 Pro (menu de vozes, sem ElevenLabs — custo)
- Imagens: Kie.ai como gateway (slides vs thumb, modelos diferentes por uso)
- Render: browser — Remotion Player (preview) + FFmpeg.wasm (export MP4 H.264)
- Publicação: com aprovação humana obrigatória. Nunca automático.
- Custo: mostrar estimativa ANTES de gerar

## Reference Style — Canal Kee (@Kee0111)
- Slides com arte dark ilustrada (Tim Burton style), narração, legendas
- Psicologia em inglês, 8-20 min, thumbnail dark + título branco em negrito

## Current State (2026-04-08)
- UI funciona, rotas funcionam, terminologia limpa ✅
- Codebase mapeado via GSD ✅
- Pipeline de produção: código existe mas não gera vídeo completo ❌
- Foundation: apenas Blocos A e B implementados, C/D/E são stubs ❌
- Studio/LongVideoStudio: não integrado ao pipeline ❌
- Export MP4: não validado ❌
- YouTube publish: não existe ❌

## Next Milestone
**Studio funcional**: um operador consegue entrar, inserir um tema, e sair com um vídeo MP4 real pronto para aprovação e upload no YouTube.

## Out of Scope (now)
- Multi-usuário / billing
- Mobile
- Qualquer feature que não seja: gerar um vídeo bem feito
