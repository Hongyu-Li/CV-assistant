import React from 'react'
import { useTranslation } from 'react-i18next'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select'

interface CvLanguageSelectProps {
  value: string
  onValueChange: (value: string) => void
}

export function CvLanguageSelect({
  value,
  onValueChange
}: CvLanguageSelectProps): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={t('resumes.cv_language_ph')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{t('resumes.lang_en')}</SelectItem>
        <SelectItem value="zh">{t('resumes.lang_zh')}</SelectItem>
        <SelectItem value="ja">{t('resumes.lang_ja')}</SelectItem>
        <SelectItem value="ko">{t('resumes.lang_ko')}</SelectItem>
        <SelectItem value="fr">{t('resumes.lang_fr')}</SelectItem>
        <SelectItem value="de">{t('resumes.lang_de')}</SelectItem>
        <SelectItem value="es">{t('resumes.lang_es')}</SelectItem>
      </SelectContent>
    </Select>
  )
}
