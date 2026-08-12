# 场景目录

按用户主要意图只读取一份场景说明：

| 用户意图 | 场景说明 |
| --- | --- |
| 查询单个或少量金融指标 | [financial-indicator-query](../skills/financial-indicator-query/SKILL.md) |
| 分析一只基金 | [fund-comprehensive-eval](../skills/fund-comprehensive-eval/SKILL.md) |
| 比较多只基金 | [fund-compare-analysis](../skills/fund-compare-analysis/SKILL.md) |
| 发现基金候选 | [fund-candidate-discovery](../skills/fund-candidate-discovery/SKILL.md) |
| 分析一只股票 | [stock-comprehensive-research](../skills/stock-comprehensive-research/SKILL.md) |
| 比较多只股票 | [stock-compare-analysis](../skills/stock-compare-analysis/SKILL.md) |
| 解读市场或板块行情 | [market-quote-diagnosis](../skills/market-quote-diagnosis/SKILL.md) |
| 汇总财经新闻 | [financial-news-briefing](../skills/financial-news-briefing/SKILL.md) |
| 对比黄金产品报价 | [gold-product-compare](../skills/gold-product-compare/SKILL.md) |
| 解释金融概念 | [financial-concept-faq-explainer](../skills/financial-concept-faq-explainer/SKILL.md) |
| 板块、基金、股票跨资产导航 | [cross-asset-relation-navigation](../skills/cross-asset-relation-navigation/SKILL.md) |

场景说明中的工具名仍然有效，但实际参数必须以 `node scripts/client.mjs list-tools wealth-ai-gateway` 返回的 `inputSchema` 为准。所有工具统一通过根目录的 `scripts/client.mjs` 调用，不依赖平台原生 MCP 配置。
