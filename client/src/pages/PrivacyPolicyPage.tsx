import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
import { ArrowLeft, Check } from "lucide-react";

export default function PrivacyPolicyPage() {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [, setLocation] = useLocation();

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    // より厳密に最後まで到達したかをチェック（許容範囲を1pxに縮小）
    const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 1;
    setHasScrolledToBottom(scrolledToBottom);
  };

  const handleAgree = () => {
    // Store consent in localStorage
    localStorage.setItem('termsAccepted', 'true');
    localStorage.setItem('privacyAccepted', 'true');
    setLocation('/stores/new/form');
  };

  const handleBack = () => {
    setLocation('/stores/new');
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
          <h1 className="text-2xl font-bold">プライバシーポリシー</h1>
          <p className="text-gray-600 mt-2">
            個人情報の取り扱いについて、最後までお読みください。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>プライバシーポリシー</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea 
              className="h-96 pr-4"
              onScrollCapture={handleScroll}
            >
              <div className="text-sm leading-relaxed space-y-4">
                <p>
                  株式会社レボル（以下「当社」といいます。）は、当社が提供する「Revol One サブスクリプションサービス」（以下「本サービス」といいます。）におけるお客様の個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
                </p>

                <h3 className="text-md font-medium">第1条（個人情報の定義）</h3>
                <p>
                  本ポリシーにおいて「個人情報」とは、個人情報の保護に関する法律（以下「個人情報保護法」といいます。）により定義された、生存する個人に関する情報であり、氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できるもの、ならびに個人識別符号が含まれるものを指します。
                </p>

                <h3 className="text-md font-medium">第2条（法令等の遵守）</h3>
                <p>
                  当社は、個人情報保護法、関連するその他の法令およびガイドラインを遵守し、お客様の個人情報を適正に取り扱います。
                </p>

                <h3 className="text-md font-medium">第3条（個人情報の取得方法）</h3>
                <p>当社は、適正かつ公正な手段により、お客様の個人情報を取得いたします。具体的には、以下の方法で取得します。</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>本サービスへの登録時における入力フォームからの取得</li>
                  <li>お問い合わせ時におけるメールや電話での取得</li>
                  <li>クッキー（Cookie）やウェブビーコン等を利用した自動的な取得</li>
                </ul>

                <h3 className="text-md font-medium">第4条（個人情報の利用目的）</h3>
                <p>当社は、取得した個人情報を以下の目的のために利用します。</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>本サービスの提供、運営、維持、改善のため</li>
                  <li>お客様からのお問い合わせやご相談への対応のため（本人確認を含む）</li>
                  <li>メンテナンス、重要なお知らせ、新機能や更新情報、キャンペーン等のご案内のため</li>
                  <li>お客様のご要望やご意見の収集、アンケートの実施のため</li>
                  <li>利用規約や法令等に違反する行為への対応のため</li>
                  <li>利用料金の請求および支払い手続きのため</li>
                  <li>サービス向上や新サービス開発のためのマーケティング調査、データ分析のため</li>
                  <li>統計データ等、個人を特定できないデータを作成し、業務遂行に利用するため</li>
                  <li>その他、上記利用目的に付随する目的</li>
                </ul>

                <h3 className="text-md font-medium">第5条（個人情報の第三者提供）</h3>
                <p>当社は、次の場合を除き、お客様の同意を得ることなく、第三者に個人情報を提供しません。</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>法令に基づく場合</li>
                  <li>人の生命、身体または財産の保護のために必要がある場合</li>
                  <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
                  <li>国の機関や地方公共団体等が法令の定める事務を遂行するために協力する必要がある場合</li>
                  <li>業務委託先に対して、業務遂行に必要な範囲で提供する場合（この場合、当社は委託先に対して適切な監督を行います）</li>
                </ul>

                <h3 className="text-md font-medium">第6条（個人情報の共同利用）</h3>
                <p>当社は、お客様の個人情報を以下のとおり共同利用することがあります。</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>共同して利用される個人情報の項目：氏名、住所、電話番号、メールアドレス、利用履歴等</li>
                  <li>共同して利用する者の範囲：当社の関連会社および提携先企業</li>
                  <li>利用目的：上記第4条に記載の目的</li>
                  <li>管理責任者：当社（株式会社レボル）</li>
                </ul>

                <h3 className="text-md font-medium">第7条（個人情報の安全管理措置）</h3>
                <p>当社は、個人情報の漏えい、滅失、毀損を防止するため、以下の安全管理措置を講じます。</p>
                
                <h4 className="text-sm font-medium">1. 組織的安全管理措置</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>個人情報保護管理者の設置</li>
                  <li>個人情報の取扱いに関する内部規程の整備</li>
                  <li>個人情報の取扱い状況の監査および見直し</li>
                </ul>

                <h4 className="text-sm font-medium">2. 人的安全管理措置</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>従業者に対する定期的な教育・研修の実施</li>
                  <li>誓約書の取得や秘密保持契約の締結</li>
                </ul>

                <h4 className="text-sm font-medium">3. 物理的安全管理措置</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>個人情報を取り扱う区域の限定と入退室管理</li>
                  <li>機器・電子媒体等の盗難・紛失防止策の実施</li>
                  <li>個人情報が記録された電子媒体の持ち出し制限</li>
                </ul>

                <h4 className="text-sm font-medium">4. 技術的安全管理措置</h4>
                <ul className="list-disc pl-6 space-y-1">
                  <li>アクセス制御による担当者および取扱う個人情報の範囲の限定</li>
                  <li>システムへのアクセス者の識別と認証の実施</li>
                  <li>不正アクセスの防止対策の実施</li>
                  <li>情報システムのセキュリティ対策の強化</li>
                </ul>

                <h4 className="text-sm font-medium">5. 外的環境の把握</h4>
                <p>個人情報を国外で取り扱う場合、当該国の法令や個人情報保護制度を確認し、適切な措置を講じます。</p>

                <h3 className="text-md font-medium">第8条（個人情報の開示、訂正、利用停止等の請求）</h3>
                <p>お客様は、当社が保有する自身の個人情報について、以下の請求を行うことができます。</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>利用目的の通知</li>
                  <li>開示</li>
                  <li>訂正、追加または削除</li>
                  <li>利用の停止または消去</li>
                  <li>第三者提供の停止</li>
                </ul>
                <p>請求手続きは、第13条（お問い合わせ窓口）に記載の連絡先までご連絡ください。ご本人確認の上、法令に従い適切に対応いたします。</p>

                <h3 className="text-md font-medium">第9条（クッキー等の利用）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>当社は、本サービスの利便性向上や利用状況の分析のため、クッキー（Cookie）やウェブビーコン等の技術を使用します。</li>
                  <li>クッキーの使用を希望されない場合は、ブラウザの設定でクッキーの受け取りを拒否することができます。ただし、その場合、本サービスの一部機能がご利用いただけない場合があります。</li>
                </ul>

                <h3 className="text-md font-medium">第10条（アクセス解析ツールについて）</h3>
                <p>当社は、Google Analytics等のアクセス解析ツールを利用しています。これらのツールは、クッキーを使用してトラフィックデータを収集します。データは匿名で収集され、個人を特定するものではありません。詳細は、各ツールのプライバシーポリシーをご確認ください。</p>

                <h3 className="text-md font-medium">第11条（免責事項）</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>当社ウェブサイトに掲載される情報の正確性・完全性について、細心の注意を払っていますが、その保証をするものではありません。</li>
                  <li>当社ウェブサイトから他のウェブサイトへのリンクが含まれる場合、当社はリンク先の内容やサービスに関して一切の責任を負いません。</li>
                  <li>お客様が当社ウェブサイトを利用したことにより生じた損害について、当社は一切の責任を負いません。</li>
                </ul>

                <h3 className="text-md font-medium">第12条（継続的改善）</h3>
                <p>当社は、個人情報の取扱いに関する社内体制を適宜見直し、継続的な改善に努めます。</p>

                <h3 className="text-md font-medium">第13条（お問い合わせ窓口）</h3>
                <p>本ポリシーに関するご質問や、個人情報の取扱いに関するお問い合わせは、以下の窓口までご連絡ください。</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="space-y-1">
                    <li><strong>会社名：</strong>株式会社レボル</li>
                    <li><strong>住所：</strong>〒332-0015 埼玉県川口市川口4-3-40 レボルビル2階</li>
                    <li><strong>代表者名：</strong>代表取締役 平井 伸幸</li>
                    <li><strong>担当部署：</strong>メーカー営業部</li>
                    <li><strong>電話番号：</strong>048-254-0070</li>
                    <li><strong>メールアドレス：</strong>info@revol-one.com</li>
                    <li><strong>受付時間：</strong>平日10:00～17:00（土日祝を除く）</li>
                  </ul>
                </div>

                <h3 className="text-md font-medium">第14条（本ポリシーの変更）</h3>
                <p>当社は、必要に応じて本ポリシーを変更することがあります。変更後の内容は、当社ウェブサイト上に掲載された時点で効力を生じます。お客様は、変更後に本サービスを利用した場合、変更後のポリシーに同意したものとみなされます。</p>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    2023年11月10日 制定<br />
                    2023年11月13日 改定<br />
                    2024年10月25日 改定
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Copyright 2023 Revol Co., Ltd.
                  </p>
                </div>
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