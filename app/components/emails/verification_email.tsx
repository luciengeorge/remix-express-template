import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

export function VerificationEmail({
  verificationCode,
  onboardingUrl,
}: {
  verificationCode: string
  onboardingUrl: string
}) {
  const year = new Date().getFullYear()
  return (
    <Html>
      <Head />
      <Preview>Confirm your email address</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src="https://res.cloudinary.com/dr3dqrprs/image/upload/v1709384473/Logo_ansmkl.png"
              width="120"
              height="36"
              alt="Skyla"
            />
          </Section>
          <Heading style={h1}>Confirm your email address</Heading>
          <Text style={heroText}>
            Your confirmation code is below - enter it in your open browser
            window and we'll help you get signed in.
          </Text>
          <Text>
            <Link href={onboardingUrl}>
              Or simply click here to verify your email
            </Link>
          </Text>

          <Section style={codeContainer}>
            <Text style={code}>{verificationCode}</Text>
          </Section>

          <Text style={text}>
            If you didn't request this email, there's nothing to worry about,
            you can safely ignore it.
          </Text>

          <Section>
            <Row style={footerLogos}>
              <Column style={{width: '66%'}}>
                <Img
                  src="https://res.cloudinary.com/dr3dqrprs/image/upload/v1709384473/Logo_ansmkl.png"
                  width="120"
                  height="36"
                  alt="Skyla"
                />
              </Column>
              <Column>
                <Section>
                  <Row>
                    <Column>
                      <Link href="https://www.skylachat.com">
                        <Img
                          src="https://res.cloudinary.com/dr3dqrprs/image/upload/v1702999675/chat-icon_ii1pz1.png"
                          width="32"
                          height="32"
                          alt="Skyla"
                          style={socialMediaIcon}
                        />
                      </Link>
                    </Column>
                    <Column>
                      <Link href="https://apps.shopify.com/skyla-chat">
                        <Img
                          src="https://res.cloudinary.com/dr3dqrprs/image/upload/v1709384864/shopify-yIPKi2jg_kykwyb.webp"
                          width="32"
                          height="32"
                          alt="Shopify"
                          style={socialMediaIcon}
                        />
                      </Link>
                    </Column>
                    <Column>
                      <Link href="https://www.linkedin.com/company/skylachat/">
                        <Img
                          src="https://res.cloudinary.com/dr3dqrprs/image/upload/v1709384956/linkedin-icon-1024x1024-net2o24e_fzwc8w.png"
                          width="32"
                          height="32"
                          alt="LinkedIn"
                          style={socialMediaIcon}
                        />
                      </Link>
                    </Column>
                  </Row>
                </Section>
              </Column>
            </Row>
          </Section>

          <Section>
            <Link
              style={footerLink}
              href="https://skylachat.com/blog"
              target="_blank"
              rel="noopener noreferrer"
            >
              Our blog
            </Link>
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            <Link
              style={footerLink}
              href="https://skylachat.com/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Policies
            </Link>
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            <Link
              style={footerLink}
              href="mailto:hello@skylachat.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact Us
            </Link>
            <Text style={footerText}>©{year} Skyla, All rights reserved.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const footerText = {
  fontSize: '12px',
  color: '#b7b7b7',
  lineHeight: '15px',
  textAlign: 'left' as const,
  marginBottom: '50px',
}

const footerLink = {
  color: '#b7b7b7',
  textDecoration: 'underline',
}

const footerLogos = {
  marginBottom: '32px',
  paddingLeft: '8px',
  paddingRight: '8px',
  width: '100%',
}

const socialMediaIcon = {
  display: 'inline',
  marginLeft: '32px',
}

const codeContainer = {
  background: 'rgba(0,0,0,.05)',
  borderRadius: '4px',
  margin: '16px auto 14px',
  verticalAlign: 'middle',
  width: '280px',
}

const code = {
  color: '#000',
  display: 'inline-block',
  fontFamily: 'HelveticaNeue-Bold',
  fontSize: '32px',
  fontWeight: 700,
  letterSpacing: '6px',
  lineHeight: '40px',
  paddingBottom: '8px',
  paddingTop: '8px',
  margin: '0 auto',
  width: '100%',
  textAlign: 'center' as const,
}

const main = {
  background: '#ffffff',
  margin: '0 auto',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  background: '#ffffff',
  margin: '0 auto',
  padding: '0px 20px',
}

const logoContainer = {
  marginTop: '32px',
}

const h1 = {
  color: '#1d1c1d',
  fontSize: '36px',
  fontWeight: '700',
  margin: '30px 0',
  padding: '0',
  lineHeight: '42px',
}

const heroText = {
  fontSize: '20px',
  lineHeight: '28px',
  marginBottom: '30px',
}

const text = {
  color: '#000',
  fontSize: '14px',
  lineHeight: '24px',
}
