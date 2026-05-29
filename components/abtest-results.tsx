'use client'

import { useABTestStore } from '@/lib/abtest-store'

export function ABTestResults() {
  const { concepts, segments, dimensions, evalConfig, results, aggregates, forcedChoices, personas, agentCount } = useABTestStore()

  const scenarioLabels: Record<string, string> = {
    friend: '朋友/同事推荐',
    ad: '信息流广告触达',
    search: '用户主动搜索',
    mandate: '公司统一采购',
    custom: evalConfig.customScenario || '自定义场景',
  }

  const attitudeLabels: Record<string, string> = {
    strong_yes: '强烈支持',
    yes: '支持',
    neutral: '观望',
    no: '不适合',
    strong_no: '强烈拒绝',
  }

  function getConceptResults(conceptId: string, segmentId: string) {
    return results.filter(r => r.conceptId === conceptId && r.segmentId === segmentId)
  }

  function getAttitudeDistribution(conceptId: string, segmentId: string) {
    const rs = getConceptResults(conceptId, segmentId)
    const dist: Record<string, number> = { strong_yes: 0, yes: 0, neutral: 0, no: 0, strong_no: 0 }
    for (const r of rs) {
      dist[r.attitude] = (dist[r.attitude] || 0) + 1
    }
    return dist
  }

  function getDimensionAvg(conceptId: string, segmentId: string, dim: string) {
    const rs = getConceptResults(conceptId, segmentId)
    const scores = rs.map(r => r.dimensionScores?.[dim]?.score).filter((s): s is number => typeof s === 'number')
    if (scores.length === 0) return null
    return { avg: scores.reduce((a, b) => a + b, 0) / scores.length, count: scores.length }
  }

  function getChoiceWinner(segmentId: string) {
    const choices = forcedChoices.filter(c => c.segmentId === segmentId)
    const counts: Record<string, number> = {}
    for (const c of choices) {
      counts[c.chosenConceptId] = (counts[c.chosenConceptId] || 0) + 1
    }
    let maxId = ''
    let maxCount = 0
    for (const [id, count] of Object.entries(counts)) {
      if (count > maxCount) { maxCount = count; maxId = id }
    }
    return { winnerId: maxId, counts, total: choices.length }
  }

  return (
    <div className="space-y-12 max-w-4xl">
      {/* 一、研究概述 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-border pb-2">一、研究概述</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><span className="text-foreground font-medium">测试方案：</span>{concepts.map(c => c.name).join(' vs ')}</p>
          <p><span className="text-foreground font-medium">目标人群：</span>{segments.map(s => s.name).join('、')}</p>
          <p><span className="text-foreground font-medium">触达场景：</span>{scenarioLabels[evalConfig.scenario] || evalConfig.scenario}</p>
          <p><span className="text-foreground font-medium">评估维度：</span>{dimensions.join('、')}</p>
          <p><span className="text-foreground font-medium">样本规模：</span>每组 {agentCount} 人，共 {results.length} 次评估</p>
          {evalConfig.decisionCriteria && (
            <p><span className="text-foreground font-medium">预设决策标准：</span>{evalConfig.decisionCriteria}</p>
          )}
          {evalConfig.hypothesis && (
            <p><span className="text-foreground font-medium">测试假设：</span>{evalConfig.hypothesis}</p>
          )}
        </div>
      </section>

      {/* 二、核心结论 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-border pb-2">二、核心结论</h2>
        {segments.map(seg => {
          const winner = getChoiceWinner(seg.id)
          const winnerConcept = concepts.find(c => c.id === winner.winnerId)
          return (
            <div key={seg.id} className="rounded-lg bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium">{seg.name}</p>
              {winnerConcept && winner.total > 0 ? (
                <p className="text-sm text-muted-foreground">
                  强制选择胜出：<span className="text-foreground font-medium">{winnerConcept.name}</span>
                  （{winner.counts[winner.winnerId]}/{winner.total} 人选择，占比 {Math.round((winner.counts[winner.winnerId] / winner.total) * 100)}%）
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">无强制选择数据</p>
              )}
              <div className="mt-2 space-y-1">
                {dimensions.map(dim => {
                  const scores = concepts.map(c => {
                    const avg = getDimensionAvg(c.id, seg.id, dim)
                    return { concept: c, avg: avg?.avg || 0 }
                  }).sort((a, b) => b.avg - a.avg)
                  const best = scores[0]
                  const gap = scores.length > 1 ? best.avg - scores[1].avg : 0
                  return (
                    <p key={dim} className="text-xs text-muted-foreground">
                      {dim}：<span className="text-foreground">{best.concept.name}</span> 领先（{best.avg.toFixed(1)} 分{gap > 0 ? `，领先 ${gap.toFixed(1)}` : ''}）
                    </p>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>

      {/* 三、分人群详细分析 */}
      {segments.map((seg, segIdx) => (
        <section key={seg.id} className="space-y-6">
          <h2 className="text-lg font-semibold border-b border-border pb-2">
            {segments.length > 1 ? `三-${segIdx + 1}` : '三'}、{seg.name} 详细分析
          </h2>

          {/* 态度分布对比 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">态度分布</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">方案</th>
                    {Object.entries(attitudeLabels).map(([key, label]) => (
                      <th key={key} className="text-center py-2 px-2 font-medium text-muted-foreground">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {concepts.map(concept => {
                    const dist = getAttitudeDistribution(concept.id, seg.id)
                    const total = Object.values(dist).reduce((a, b) => a + b, 0)
                    return (
                      <tr key={concept.id} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-medium">{concept.name}</td>
                        {Object.keys(attitudeLabels).map(key => (
                          <td key={key} className="text-center py-2 px-2">
                            {dist[key] > 0 ? (
                              <span>{dist[key]} <span className="text-muted-foreground">({Math.round((dist[key] / (total || 1)) * 100)}%)</span></span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 维度评分对比 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">维度评分对比</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">维度</th>
                    {concepts.map(c => (
                      <th key={c.id} className="text-center py-2 px-3 font-medium text-muted-foreground">{c.name}</th>
                    ))}
                    {concepts.length > 1 && (
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">差距</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dimensions.map(dim => {
                    const scores = concepts.map(c => getDimensionAvg(c.id, seg.id, dim))
                    const avgs = scores.map(s => s?.avg || 0)
                    const maxAvg = Math.max(...avgs)
                    const minAvg = Math.min(...avgs)
                    return (
                      <tr key={dim} className="border-b border-border/50">
                        <td className="py-2 pr-4">{dim}</td>
                        {scores.map((s, i) => (
                          <td key={concepts[i].id} className={`text-center py-2 px-3 ${s?.avg === maxAvg && maxAvg > minAvg ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {s ? s.avg.toFixed(1) : '-'}
                          </td>
                        ))}
                        {concepts.length > 1 && (
                          <td className="text-center py-2 px-3 text-muted-foreground">
                            Δ{(maxAvg - minAvg).toFixed(1)}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 逐方案个体评价 */}
          {concepts.map(concept => {
            const conceptResults = getConceptResults(concept.id, seg.id)
            return (
              <div key={concept.id} className="space-y-3">
                <h3 className="text-sm font-medium">「{concept.name}」个体评价详情</h3>
                <div className="space-y-3">
                  {conceptResults.map(r => (
                    <div key={r.personaId} className="rounded-lg bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{r.personaName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          r.attitude === 'strong_yes' || r.attitude === 'yes' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                          r.attitude === 'no' || r.attitude === 'strong_no' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                          'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {attitudeLabels[r.attitude] || r.attitude}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground italic">"{r.firstImpression}"</p>
                      {r.attitudeReason && (
                        <p className="text-xs text-muted-foreground">态度理由：{r.attitudeReason}</p>
                      )}
                      {r.dimensionScores && Object.keys(r.dimensionScores).length > 0 && (
                        <div className="grid grid-cols-1 gap-1 mt-1">
                          {Object.entries(r.dimensionScores).map(([dim, data]) => (
                            <div key={dim} className="flex gap-2 text-[11px]">
                              <span className="text-muted-foreground shrink-0 w-16">{dim}</span>
                              <span className="text-foreground font-medium w-4">{data.score}</span>
                              <span className="text-muted-foreground">{data.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* 强制选择详情 */}
          {forcedChoices.filter(c => c.segmentId === seg.id).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">强制选择详情</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">用户</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">选择</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">理由</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">放弃原因</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forcedChoices.filter(c => c.segmentId === seg.id).map(choice => {
                      const chosen = concepts.find(c => c.id === choice.chosenConceptId)
                      const rejections = Object.entries(choice.rejectionReasons || {}).map(([id, reason]) => {
                        const c = concepts.find(x => x.id === id)
                        return `${c?.name || '?'}：${reason}`
                      })
                      return (
                        <tr key={choice.personaId} className="border-b border-border/50">
                          <td className="py-2 pr-4">{choice.personaName}</td>
                          <td className="py-2 px-3 font-medium">{chosen?.name || '?'}</td>
                          <td className="py-2 px-3 text-muted-foreground">{choice.reasoning}</td>
                          <td className="py-2 px-3 text-muted-foreground">{rejections.join('；')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ))}

      {/* 四、量化模型预测 */}
      {aggregates.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-border pb-2">四、量化模型预测</h2>
          <p className="text-xs text-muted-foreground">基于 OCEAN 人格特质 + 认知偏差的确定性模型计算（非 LLM 主观判断）</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">人群 × 方案</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">整体接受度</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">价格接受</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">易用匹配</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">情感吸引</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">预测采用率</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">预测NPS</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map(agg => {
                  const seg = segments.find(s => s.id === agg.segmentId)
                  const con = concepts.find(c => c.id === agg.conceptId)
                  return (
                    <tr key={`${agg.segmentId}-${agg.conceptId}`} className="border-b border-border/50">
                      <td className="py-2 pr-4">{seg?.name} × {con?.name}</td>
                      <td className="text-center py-2 px-2">{(agg.mean.overallAcceptance * 100).toFixed(0)}%</td>
                      <td className="text-center py-2 px-2">{(agg.mean.priceAcceptance * 100).toFixed(0)}%</td>
                      <td className="text-center py-2 px-2">{(agg.mean.usabilityFit * 100).toFixed(0)}%</td>
                      <td className="text-center py-2 px-2">{(agg.mean.emotionalAppeal * 100).toFixed(0)}%</td>
                      <td className="text-center py-2 px-2">{(agg.adoptionRate * 100).toFixed(0)}%</td>
                      <td className="text-center py-2 px-2">{agg.npsScore > 0 ? '+' : ''}{agg.npsScore.toFixed(0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 五、样本画像 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-border pb-2">五、样本画像</h2>
        {segments.map(seg => {
          const segPersonas = personas[seg.id] || []
          return (
            <div key={seg.id} className="space-y-2">
              <h3 className="text-sm font-medium">{seg.name}（{segPersonas.length} 人）</h3>
              <div className="grid gap-2">
                {segPersonas.map(p => (
                  <div key={p.id} className="text-xs text-muted-foreground rounded bg-muted/20 p-2.5">
                    <span className="text-foreground font-medium">{p.name}</span>
                    <span className="mx-1">·</span>
                    {p.background}
                    <span className="mx-1">·</span>
                    决策风格：{p.decisionStyle}
                    <span className="mx-1">·</span>
                    月预算：{p.monthlyBudget}
                    <span className="mx-1">·</span>
                    当前用：{p.currentSolution}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
