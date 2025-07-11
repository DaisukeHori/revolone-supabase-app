import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
import { ArrowLeft, Check } from "lucide-react";

export default function TermsOfServicePage() {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [, setLocation] = useLocation();

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    // 残り5px以下の場合のみアクティブ
    const remaining = scrollHeight - (scrollTop + clientHeight);
    const scrolledToBottom = remaining <= 5;
    

    
    setHasScrolledToBottom(scrolledToBottom);
  };

  const handleAgree = () => {
    setLocation('/stores/new/privacy-policy');
  };

  const handleBack = () => {
    setLocation('/');
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-2xl font-bold">利用規約</h1>
          <p className="text-gray-600 mt-2">
            サービスをご利用いただくため、利用規約を最後までお読みください。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Revol One サブスクリプション利用規約</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea 
              className="h-64 pr-4"
              onScrollCapture={handleScroll}
            >
              <div className="text-sm leading-relaxed space-y-4">
                <p>
                  本利用規約（以下、「本規約」といいます。）は、株式会社レボル（以下、「当社」といいます。）が展開するRevol Oneサブスクリプションサービス（以下、「本サービス」といいます。）の基盤となる利用条件およびお客様と当社間の権利義務関係を規定するものです。本サービスは、美容室業界における競争力強化と顧客満足度の向上を目指し、「Revonizer」オゾン発生器のサブスクリプション型利用を通じて、継続的で高品質なサービスを提供します。
                </p>
                
                <p>
                  また、本サービスは、定期的なメンテナンス、サポート、迅速な修理や交換対応を通じて、事業の持続可能な成長と安定した運営を支援します。当社は、美容室の経営者が直面する様々な課題に対応し、経営の最適化を追求するために、継続的なサポートと革新的なソリューションを提供し続けます。
                </p>

                <h2 className="text-lg font-semibold">第1章 総則</h2>

                <h3 className="text-md font-medium">第1条（目的）</h3>
                <p>
                  本規約は、当社とお客様との間の本サービスに関する一切の権利義務を定めるものです。お客様は、本規約の内容を十分に理解し、同意の上で本サービスを利用するものとします。
                </p>

                <h3 className="text-md font-medium">第2条（定義）</h3>
                <p>本規約において使用する用語の定義は、以下のとおりとします。</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>「当社」：株式会社レボルをいいます。</li>
                  <li>「お客様」：本サービスを申し込み、利用する美容室経営者および運営担当者をいいます。</li>
                  <li>「本サービス」：当社が提供する「Revonizer」オゾン発生器のサブスクリプションサービスをいいます。</li>
                  <li>「オゾン発生器」：当社が提供する「Revonizer」をいいます。</li>
                  <li>「利用料金」：本サービスの利用に対してお客様が当社に支払う料金をいいます。</li>
                  <li>「契約期間」：本サービスの利用契約が有効に存続する期間をいいます。</li>
                </ul>

                <h3 className="text-md font-medium">第3条（適用範囲）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>本規約は、本サービスに申し込み、及び利用する全てのお客様に適用されます。</li>
                  <li>当社は、本規約の他に、特定のサービスに関する個別の利用規約やガイドラインを設けることがあり、それらは本規約の一部を構成します。</li>
                  <li>本規約と個別の利用規約やガイドラインが矛盾する場合、個別の利用規約やガイドラインが優先されます。</li>
                </ul>

                <h3 className="text-md font-medium">第4条（本規約の変更と通知）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>当社は、法令の改正、社会情勢の変化、その他当社の事情により、本規約を変更する必要があると判断した場合、いつでも本規約を変更することができます。</li>
                  <li>本規約を変更する場合、当社は変更内容を当社ウェブサイト上に掲載する方法によりお客様に通知します。</li>
                  <li>変更後の本規約は、当社が別途定める場合を除き、ウェブサイト上に掲載された時点から効力を生じるものとします。</li>
                  <li>お客様が変更後の本規約の効力発生後に本サービスを利用した場合、変更後の本規約に同意したものとみなされます。</li>
                </ul>

                <h2 className="text-lg font-semibold">第2章 サービス内容</h2>

                <h3 className="text-md font-medium">第5条（サービス概要）</h3>
                <p>1. 本サービスは、美容室向けのオゾン発生器「Revonizer」のサブスクリプションモデルであり、以下のサービスを含みます。</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>オゾン発生器の長期貸与</li>
                  <li>定期的なメンテナンスおよびサポート</li>
                  <li>故障時の迅速な修理または交換対応</li>
                </ul>
                <p>2. 本サービスを通じて、お客様の美容室環境の改善および運営効率の向上を支援します。</p>

                <h3 className="text-md font-medium">第6条（申込資格）</h3>
                <p>1. 本サービスの申込資格は、以下の条件を満たす法人または個人事業主に限定されます。</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>美容室の経営者または運営担当者であること</li>
                  <li>日本国内に事業所を有すること</li>
                  <li>18歳以上であること（個人事業主の場合）</li>
                </ul>
                <p>2. 当社は、申込者が前項の条件を満たさないと判断した場合、申込みを承諾しないことがあります。</p>

                <h3 className="text-md font-medium">第7条（利用料金と支払い条件）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>本サービスの利用料金は、月額9,900円（税込）とします。</li>
                  <li>利用料金の支払いは、クレジットカードを介した自動定期決済サービスStripeを利用します。</li>
                  <li>毎月の決済日に当月分の利用料金が自動的に引き落とされます。</li>
                  <li>当社は、経済状況や市場動向等により、利用料金を変更することができます。ただし、既に契約中のお客様には適用されず、新規契約または再契約時から適用されます。</li>
                  <li>利用料金の変更を行う場合、当社は事前に当社ウェブサイト上で通知します。</li>
                </ul>

                <h2 className="text-lg font-semibold">第3章 サービスの利用</h2>

                <h3 className="text-md font-medium">第8条（サービス利用の開始）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>お客様は、当社所定の申込手続きを完了し、当社からのサービス開始通知を受領した後、本サービスを利用することができます。</li>
                  <li>初回の利用料金の決済が完了した後、当社は速やかにオゾン発生器を発送します。</li>
                  <li>お客様がオゾン発生器を受領した時点で、本サービスの利用が正式に開始されます。</li>
                </ul>

                <h3 className="text-md font-medium">第9条（利用期間と更新）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>本サービスの契約期間は1ヶ月とします。</li>
                  <li>契約期間は、特段の手続きがない限り、自動的に1ヶ月ごとに更新されます。</li>
                  <li>更新を希望しない場合、お客様は契約期間満了の30日前までに、当社のウェブサイトまたはアプリを通じて解約手続きを行う必要があります。</li>
                </ul>

                <h3 className="text-md font-medium">第10条（設備の設置とメンテナンス）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>オゾン発生器の設置は、お客様の責任と費用において適切に行うものとします。</li>
                  <li>当社は、設置に関するサポート情報を提供しますが、設置作業自体はお客様が行うものとします。</li>
                  <li>メンテナンスは、当社が定めるスケジュールに従い、当社または当社が委託した専門スタッフが行います。</li>
                  <li>お客様は、日常的な清掃や簡易的な点検を行い、オゾン発生器を適切な状態に保つよう努めるものとします。</li>
                </ul>

                <h3 className="text-md font-medium">第11条（故障時の対応）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>オゾン発生器に故障や不具合が生じた場合、お客様は速やかに当社のカスタマーサポートに連絡し、指示を仰ぐものとします。</li>
                  <li>当社は、状況に応じて無償修理または同等機種への交換を行います。ただし、お客様の故意または過失による損傷の場合は、この限りではありません。</li>
                  <li>故障や不具合の対応期間中、お客様に生じた営業上の損害について、当社は一切の責任を負いません。</li>
                </ul>

                <h2 className="text-lg font-semibold">第4章 解約、契約終了およびサービス中断</h2>

                <h3 className="text-md font-medium">第12条（解約手続き）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>お客様が本サービスの解約を希望する場合、解約希望日の30日前までに当社に通知する必要があります。</li>
                  <li>解約手続きは、当社のウェブサイトまたはアプリを通じて行うものとします。</li>
                  <li>解約手続き完了後、当社は解約日から1週間以内に返送キットをお客様に送付します。</li>
                  <li>お客様は、返送キット受領後1週間以内に、同封された着払い伝票を使用してオゾン発生器を当社指定の住所に返送するものとします。</li>
                  <li>オゾン発生器の返送にかかる送料は、当社が負担します。</li>
                </ul>

                <h3 className="text-md font-medium">第13条（機器の損傷と費用負担）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>お客様は、オゾン発生器を善良な管理者の注意をもって使用および保管するものとします。</li>
                  <li>利用期間に対して機器が著しく損傷している場合、または紛失した場合、当社はお客様に対して修理費用または機器の再調達費用を請求することがあります。</li>
                  <li>損傷の程度や原因については、当社が合理的な範囲で判断し、お客様に説明します。</li>
                </ul>

                <h3 className="text-md font-medium">第14条（契約の終了とサービス中断）</h3>
                <p>1. お客様が以下のいずれかに該当する場合、当社は事前の通知なく契約を終了し、サービスを中断することができます。</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>利用料金の不払いが発生した場合</li>
                  <li>本規約に違反した場合</li>
                  <li>不正行為や法令違反があった場合</li>
                </ul>
                <p>2. 契約が終了した場合、お客様は直ちにオゾン発生器を返却するものとします。</p>
                <p>3. 当社は、契約終了またはサービス中断によりお客様に生じた損害について、一切の責任を負いません。</p>

                <h3 className="text-md font-medium">第15条（遅延損害金）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>お客様が利用料金の支払いを遅延した場合、支払期日の翌日から完済まで、年14.6％の遅延損害金が発生します。</li>
                  <li>支払いが1ヶ月以上遅延した場合、当社はサービスを強制的に終了し、オゾン発生器の返還を求めることができます。</li>
                  <li>当社は、遅延損害金の請求に加え、法的措置を取る場合があります。</li>
                </ul>

                <h2 className="text-lg font-semibold">第5章 サービスの停止・中断</h2>

                <h3 className="text-md font-medium">第16条（サービスの停止・中断）</h3>
                <p>1. 当社は、以下のいずれかの事由が生じた場合、お客様に事前に通知することなく、本サービスの全部または一部を一時的に停止または中断することがあります。</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>システムの保守、点検、更新を行う場合</li>
                  <li>火災、停電、天災地変などの不可抗力によりサービスの提供が困難な場合</li>
                  <li>システムの障害、第三者からの不正アクセス、ウイルス感染などによりサービスの提供が困難な場合</li>
                  <li>法令や行政機関の要請によりサービスの提供が必要と判断される場合</li>
                  <li>その他、当社がサービスの停止・中断が必要と判断した場合</li>
                </ul>
                <p>2. 当社は、サービスの停止・中断に際して可能な限り事前にお客様に通知しますが、緊急の場合はこの限りではありません。</p>
                <p>3. 当社は、本条に基づくサービスの停止・中断によりお客様または第三者に生じた損害について、一切の責任を負いません。</p>

                <h2 className="text-lg font-semibold">第6章 知的財産権</h2>

                <h3 className="text-md font-medium">第17条（知的財産権の帰属）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>1. 本サービスおよび関連する一切のコンテンツ、ソフトウェア、ドキュメンテーション、ノウハウ、商標、特許等の知的財産権は、全て当社または正当な権利を有する第三者に帰属します。</li>
                  <li>2. お客様は、当社または正当な権利を有する第三者の事前の書面による許可なく、これらを複製、改変、翻案、翻訳、転載、公衆送信、頒布、出版、商業的利用等を行ってはなりません。</li>
                  <li>3. お客様は、本サービスを利用することにより、当社または第三者の知的財産権を侵害しないものとします。</li>
                </ul>

                <h2 className="text-lg font-semibold">第7章 免責事項</h2>

                <h3 className="text-md font-medium">第18条（免責事項の詳細化）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>当社は、本サービスに関して、お客様に提供する情報、データ、プログラム、各種メッセージ等について、その完全性、正確性、有用性、最新性、適合性、特定目的への適合性等につき、いかなる保証も行いません。</li>
                  <li>当社は、お客様が本サービスを利用することにより被った損害、損失、不利益等（営業上の損害、データの消失、機器の故障等を含むがこれらに限られない）について、当社の故意または重大な過失による場合を除き、一切責任を負いません。</li>
                  <li>当社は、本サービスに関連してお客様と第三者との間において生じた取引、連絡、紛争等について、一切関与せず、責任を負いません。</li>
                  <li>当社は、第三者のサービス障害、ウイルス感染、データの消失・改ざん等により生じた損害について、一切責任を負いません。</li>
                  <li>当社は、本サービスの利用に起因してお客様の設備やデータに生じた損害について、一切責任を負いません。</li>
                </ul>

                <h2 className="text-lg font-semibold">第8章 個人情報の利用と保護</h2>

                <h3 className="text-md font-medium">第19条（個人情報の利用目的）</h3>
                <p>1. 当社は、お客様の個人情報を以下の目的で利用します。</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>本サービスの提供、運営、管理</li>
                  <li>お客様からの問い合わせへの対応</li>
                  <li>本サービスに関する案内、お知らせの送付</li>
                  <li>料金請求、収納管理</li>
                  <li>サービス改善や新サービスの開発に関する市場調査、データ分析</li>
                </ul>
                <p>2. 当社は、上記目的の達成に必要な範囲を超えて、お客様の個人情報を利用しません。</p>

                <h3 className="text-md font-medium">第20条（個人情報の管理と保護）</h3>
                <p>当社は、お客様の個人情報の漏洩、紛失、毀損、不正アクセスを防止するため、適切なセキュリティ対策を講じます。</p>
              </div>
            </ScrollArea>
            
            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleAgree}
                disabled={!hasScrolledToBottom}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
              >
                {hasScrolledToBottom ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    同意して次へ
                  </>
                ) : (
                  "最後までお読みください"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}