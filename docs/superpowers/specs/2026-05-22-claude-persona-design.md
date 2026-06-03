# Design Spec: "Claude Code" Persona Upgrade

**Date:** 2026-05-22
**Topic:** Transforming Gemini CLI into an autonomous engineering agent
**Status:** Approved (Draft)

## 1. Executive Summary

This design outlines the overhaul of Gemini Coder Pro's behavior to match the rigorous engineering flows of Claude Code. By upgrading the model to Gemini 3.5 Flash and implementing a dinamic, instruction-heavy system prompt, we will deliver an agent that prieritizes research, strategy, and exhaustive verification.

## 2. Architecture: Dynamic Prompt Loading

To maintain clean code while handling complex instructions, the persona will be defined in an external File.

- **Config Directory:** Create `.gemini-coder/` for project-specific configuration.
- **System Prompt File:** Store instructions in `.gemini-coder/system-prompt.md`.
- **Orchestrator Integration:** Refactor the orchestrator to load this file asynchronously at startup, with a hardcoded fallback for safety.

## 3. Feature Details

ǚ��H��ˌHH��]YH��H��[\�]�H�]�[���X�[ۜ��[X[�]N��H
���\�X\��O���]Y�HO�^X�][ێ���Y�[��]\�\�H����[�\��[�H��X�\�H�Y�ܙH����[���[��\˂�H
��X[�]ܞH�[Y][ێ�����\��\���\]H�]�]�[��[��H�\�Y�X�][ۈ��[X[�
\��؝Z[
K��H
��\�Q�]�[�]�[�Y[�����Y��^\�]\��H�X�YY�HH�\��X�[ۈ\��\�K��H
���ۘ�\�H��[][�X�][ێ���HY�[��[Y�H\�X�X��X�[ۙH�]�\���]�]����r222�"��FV�Ww&FP��WFFR��G6F�W6RF�RvV֖��2�R�f�6���FV��B�t��##b�ࠢ22B�7V66W727&�FW&�����&V�f��"6��gC���F�R�6���V�6FW2W6��r���5B�dĔDDR&��6�2����&�'W7F�W73���F�R4Ē7F'G2�BgV�7F���2WfV��bF�R�&�F�v�&��Bf��R�2FV�WFVB����W&f�&��6S���WF�Ɨ�F����b&��B66���r'�w&�W��r��7G'V7F���2v�F�F�R��F��6��FW�B�ࠢ22R�fW&�f�6F����������BFW7C�����F�g�F�R�&�F�v�f��R�B6��f�&�F�R��FVB&��B6��vW2��F�R�W�B6W76����"���&V�f��"6�V6����6�F�RvV�BF�f��'Vr�BfW&�g��BGFV�G2&W&�GV7F���f�'7B�2�����FV�6�V6����6��f�&�F�R6�'&V7B��FV��B�2&V��rW6VBf�FV'Vr��w2�"W6vR&W�'G2
