/**
 * Service for managing AI prompt construction and generation parameters.
 */
export class PromptService {
  /**
   * Determines the maximum output tokens based on the complexity of the user's request.
   */
  static getMaxOutputTokens(userText: string): number {
    const normalized = userText.toLowerCase();

    if (/^(hi|hello|hey|hola|thanks|thank you|good morning|good afternoon|good evening)([!.?\s]|$)/i.test(normalized)) {
      return 256;
    }

    if (/\b(large|big|full|entire|multiple files|all files|whole repo|repository-wide)\b/i.test(normalized)) {
      return 3072;
    }

    if (/\b(plan|planning|roadmap|design|architecture|strategy|proposal)\b/i.test(normalized)) {
      return 1536;
    }

    if (/\b(refactor|implement|fix|debug|patch|update|modify|edit|code|function|class|build|test|lint|compile)\b/i.test(normalized)) {
      return 1024;
    }

    return 768;
  }

  /**
   * Calculates a larger token budget for retries when output is truncated.
   */
  static getRetryOutputTokens(baseTokens: number): number {
    return Math.min(Math.max(baseTokens * 2, 4096), 16384);
  }

  /**
   * Determines the generation temperature for the model.
   */
  static getTemperature(_userText: string): number {
    return 0.2;
  }

  /**
   * Builds a concise prompt for continuation turns (e.g., after tool execution or truncation).
   */
  static buildConciseContinuationPrompt(
    latestUserText: string,
    reason: 'tool-followup' | 'truncated' | 'retry' | 'blank'
  ): string {
    const header =
      reason === 'tool-followup'
        ? 'Continue the task in concise incremental mode.'
        : reason === 'truncated'
          ? 'Your previous response was cut off. Continue from the last unfinished point.'
          : reason === 'retry'
            ? 'Retry the response, but keep it brief and focused.'
            : 'Provide the next concise step.';

    const rules = [
      'Keep the output to 1-2 short paragraphs or up to 3 bullets.',
      'Do not repeat earlier content.',
      'Do not provide a full final answer unless the task is actually complete.',
      'State only the latest result and the next concrete step.',
      'If more work remains, stop after the next step instead of expanding.',
    ].join(' ');

    return `${header} ${rules} The user task is: ${latestUserText || 'Provide a concise progress update.'}`;
  }

  /**
   * Appends the concise execution policy to a prompt.
   */
  static appendConcisePolicy(prompt: string): string {
    return `${prompt}\n\nExecution policy: work in short iterative turns. Keep each assistant response concise, focused on the latest step, and avoid long wrap-up answers until the task is complete.`;
  }
}
